/* =====================================================
   DOLFINES ACCOUNT MANAGEMENT PORTAL – SHARED JS
   ===================================================== */

// ── Supabase client ──────────────────────────────────
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Session cache ────────────────────────────────────
window._cache = { accounts: [] };
window._currentUser = null;

// ── Auth ─────────────────────────────────────────────
async function login(email, password) {
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

async function logout() {
  await _sb.auth.signOut();
  window.location.href = 'login.html';
}

async function requireAuth() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  window._currentUser = {
    id:    session.user.id,
    email: session.user.email,
    name:  session.user.user_metadata?.full_name ||
           session.user.email.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  };
  return window._currentUser;
}

function getAuthUser() {
  return window._currentUser;
}

// ── DB ↔ JS mapping ───────────────────────────────────
function dbRowToAccount(row) {
  return {
    id:            row.id,
    accountName:   row.account_name,
    tier:          row.tier,
    icpScore:      row.icp_score,
    icpFit:        row.icp_fit,
    icpSelections: row.icp_selections,
    accountOwner:  row.account_owner,
    lastUpdated:   row.last_updated,
    reviewDate:    row.review_date,
    target:        row.target,
    achieved:      row.achieved,
    comments:      row.comments,
    actions:       row.actions || {},
  };
}

function accountToDbRow(account) {
  return {
    id:              account.id,
    user_id:         window._currentUser?.id,
    account_name:    account.accountName,
    tier:            account.tier            || null,
    icp_score:       account.icpScore        || null,
    icp_fit:         account.icpFit          || null,
    icp_selections:  account.icpSelections   || null,
    account_owner:   account.accountOwner    || null,
    last_updated:    account.lastUpdated     || null,
    review_date:     account.reviewDate      || null,
    target:          account.target          || null,
    achieved:        account.achieved        || null,
    comments:        account.comments        || null,
    actions:         account.actions         || {},
  };
}

// ── Data helpers (async write, sync read from cache) ──
async function initData() {
  if (!window._currentUser) return;
  const { data, error } = await _sb.from('accounts').select('*').order('created_at', { ascending: true });
  if (!error && data) {
    window._cache.accounts = data.map(dbRowToAccount);
  } else if (error) {
    console.error('initData error:', error);
  }
}

function getAccounts() {
  return window._cache.accounts || [];
}

function getAccountById(id) {
  return (window._cache.accounts || []).find(a => a.id === id) || null;
}

async function saveAccount(account) {
  if (!window._currentUser) return;
  const row = accountToDbRow(account);
  const { error } = await _sb.from('accounts').upsert(row, { onConflict: 'id' });
  if (!error) {
    const idx = window._cache.accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) window._cache.accounts[idx] = account;
    else window._cache.accounts.push(account);
  } else {
    console.error('saveAccount error:', error);
    showToast('Erreur lors de la sauvegarde.', 'error');
  }
}

async function deleteAccount(id) {
  const { error } = await _sb.from('accounts').delete().eq('id', id);
  if (!error) {
    window._cache.accounts = window._cache.accounts.filter(a => a.id !== id);
  } else {
    console.error('deleteAccount error:', error);
    showToast('Erreur lors de la suppression.', 'error');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Status Helpers ───────────────────────────────────
const STATUS_OPTS = [
  { value: 'done',        label: 'Done',        cls: 'status-done',        icon: '&#10003;' },
  { value: 'in-progress', label: 'In Progress', cls: 'status-progress',    icon: '&#9888;'  },
  { value: 'not-started', label: 'Not Started', cls: 'status-not-started', icon: '&#10007;' },
  { value: 'na',          label: 'N/A',         cls: 'status-na',          icon: '-'        },
];

function statusBadge(value) {
  const opt = STATUS_OPTS.find(o => o.value === value) || STATUS_OPTS[2];
  return `<span class="status-badge ${opt.cls}">${opt.icon} ${opt.label}</span>`;
}

function statusIcon(value) {
  const map = { done: '&#10003;', 'in-progress': '&#9888;', 'not-started': '&#10007;', na: '-' };
  return map[value] || '-';
}

// ── ICP Helpers ──────────────────────────────────────
function classifyICP(score) {
  if (score >= 386) return { tier: 'Key',           fit: 'Excellent Fit', cls: 'tier-key'  };
  if (score >= 264) return { tier: 'Key',           fit: 'Good Fit',      cls: 'tier-key'  };
  if (score >= 211) return { tier: 'Core',          fit: 'Moderate Fit',  cls: 'tier-core' };
  if (score >= 141) return { tier: 'Opportunistic', fit: 'Low Fit',       cls: 'tier-opp'  };
  return               { tier: 'Opportunistic',     fit: 'Poor Fit',      cls: 'tier-opp'  };
}

function computeICP(selections) {
  let total = 0;
  Object.values(selections).forEach(s => {
    const vs = parseInt(s.valueScore) || 0;
    const is = parseInt(s.importanceScore) || 0;
    total += vs * is;
  });
  return total;
}

// ── Sidebar Builder ──────────────────────────────────
function buildSidebar(activePage) {
  const pages = [
    { href: 'account-tracker.html',      icon: '&#128202;', label: 'Account Tracker',      section: 'Gestion des comptes' },
    { href: 'account-detail.html',       icon: '&#128203;', label: 'Account Detail',       section: null },
    { href: 'account-actions.html',      icon: '&#10003;',  label: 'Account Actions',      section: null },
    { href: 'ideal-client-profile.html', icon: '&#127919;', label: 'Ideal Client Profile', section: null },
    { href: 'dropdown-values.html',      icon: '&#128209;', label: 'Valeurs de r\u00e9f\u00e9rence', section: 'R\u00e9f\u00e9rence' },
    { href: 'process.html',              icon: '&#128214;', label: 'Proc\u00e9dure',        section: null },
  ];

  let html = `
    <div style="padding:16px 20px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:8px;">
      <div style="width:6px;height:6px;border-radius:50%;background:#1863DC;flex-shrink:0;"></div>
      <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.8px;color:rgba(255,255,255,0.35);">Navigation</span>
    </div>`;

  let lastSection = '';
  pages.forEach(p => {
    if (p.section && p.section !== lastSection) {
      html += `<div class="sidebar-section">${p.section}</div>`;
      lastSection = p.section;
    } else if (!p.section && lastSection !== '__none__') {
      lastSection = '__none__';
    }
    const active = activePage === p.href ? 'active' : '';
    html += `<a href="${p.href}" class="${active}"><span class="icon">${p.icon}</span>${p.label}</a>`;
  });

  html += `<div class="sidebar-divider"></div>
  <a href="#" onclick="logout(); return false;" style="color:rgba(255,255,255,0.45);font-size:12px;">
    <span class="icon" style="font-size:13px;">&#128682;</span>Se d\u00e9connecter
  </a>`;

  return `<nav class="sidebar">${html}</nav>`;
}

// ── Header Builder ───────────────────────────────────
function buildHeader(pageTitle) {
  const user = getAuthUser();
  const name = user ? user.name : '';
  return `
  <header class="site-header">
    <img src="../Banque d'images/DOL-COG-IV-018-A -Logo final Dolfines Group EN white.png" alt="Dolfines" class="logo">
    <div class="separator"></div>
    <span class="portal-name">Account Management Portal</span>
    <span class="page-title">${pageTitle || ''}</span>
    <div class="user-info">
      <span style="color:rgba(255,255,255,0.55);font-size:12px;">&#128100; ${name}</span>
      <button class="btn-logout" onclick="logout()">D\u00e9connexion</button>
    </div>
  </header>`;
}

// ── Completion Calculator ────────────────────────────
function calcCompletion(actions) {
  if (!actions) return 0;
  const vals = Object.values(actions);
  if (!vals.length) return 0;
  const done = vals.filter(v => v.status === 'done' || v.status === 'na').length;
  return Math.round((done / vals.length) * 100);
}

// ── 25 Actions Definition ────────────────────────────
const ACTIONS = [
  // ACCOUNT SETUP & ASSESSMENT
  { id: 1,  group: 'Account Setup & Assessment',        name: 'Client classification',
    def: 'Classify client as Current / Previous / Prospect / New',
    system: 'CRM Client Tab', kpi: 'Classification completeness', tiers: ['key', 'core', 'opp'] },
  { id: 2,  group: 'Account Setup & Assessment',        name: 'ICP calculation (current, new, previous)',
    def: 'Calculate ICP score based on excel sheet ICP for Current / Previous / New',
    system: 'CRM + ICP excel attached to client file', kpi: '% clients with ICP', tiers: ['key', 'core', 'opp'] },
  { id: 3,  group: 'Account Setup & Assessment',        name: 'ICP estimation (prospects)',
    def: 'Estimate ICP score for prospects',
    system: 'CRM Client Tab', kpi: 'ICP coverage on prospects', tiers: ['key', 'core', 'opp'] },
  { id: 4,  group: 'Account Setup & Assessment',        name: 'Key account classification',
    def: 'Classify Key / Core / Opportunistic accounts',
    system: 'CRM Client Tab', kpi: '% accounts tiered', tiers: ['key', 'core', 'opp'] },
  // STRATEGIC PLANNING & GOVERNANCE
  { id: 5,  group: 'Strategic Planning & Governance',   name: 'Project & opportunity mapping',
    def: 'Identify current Client projects and future pipeline',
    system: 'CRM Project Tab', kpi: 'Pipeline value', tiers: ['key', 'core'] },
  { id: 6,  group: 'Strategic Planning & Governance',   name: 'Annual revenue target definition',
    def: 'Define annual revenue target per client (to be performed before year start)',
    system: 'CRM + Account Excel Sheet', kpi: 'Revenue vs target', tiers: ['key'] },
  { id: 7,  group: 'Strategic Planning & Governance',   name: 'Account review (annual)',
    def: 'Annual strategic account review with Head of Strategy. Reassess ICP and account strategy once a year',
    system: 'CRM + Account Excel Sheet', kpi: 'Review completed', tiers: ['key'] },
  // ACCOUNT INTELLIGENCE & MAPPING
  { id: 8,  group: 'Account Intelligence & Mapping',    name: 'Client organization mapping',
    def: 'Map HQ, subsidiaries, entities, regions, decision-makers',
    system: 'CRM Client Tab "Update"', kpi: 'Mapping completeness', tiers: ['key', 'core'] },
  { id: 9,  group: 'Account Intelligence & Mapping',    name: 'Competitor identification',
    def: 'Identify active competitors on the account',
    system: 'CRM Competitor Tab', kpi: 'Competitor coverage tab on Monday', tiers: ['key', 'core'] },
  { id: 10, group: 'Account Intelligence & Mapping',    name: 'Market intelligence',
    def: 'Collect market intelligence',
    system: 'CRM Client Tab "Update"', kpi: '# insights logged', tiers: ['key', 'core'] },
  { id: 11, group: 'Account Intelligence & Mapping',    name: 'Key contacts gathering',
    def: 'Maintain technical, procurement, and decision-maker contacts',
    system: 'CRM Contact Tab', kpi: '# key contacts per account', tiers: ['key', 'core', 'opp'] },
  // RELATIONSHIP MANAGEMENT
  { id: 12, group: 'Relationship Management',           name: 'Formal client meetings',
    def: 'Conduct structured meetings once per quarter for Key and Core account, once per year for opportunistic accounts',
    system: 'CRM MOM Tab', kpi: '# meetings/year', tiers: ['key', 'core', 'opp'] },
  { id: 13, group: 'Relationship Management',           name: 'Executive sponsorship',
    def: 'Maintain one senior-level relationship',
    system: 'CRM Contact Tab', kpi: '# executive interactions', tiers: ['key'] },
  { id: 14, group: 'Relationship Management',           name: 'Client satisfaction monitoring',
    def: 'Monitor satisfaction during and after project execution. Collect feedback and improvement areas. Participation of close-out meeting',
    system: 'CRM Customer feedback', kpi: 'Satisfaction score + close-out participation', tiers: ['key', 'core', 'opp'] },
  { id: 15, group: 'Relationship Management',           name: 'Consultant market feedback',
    def: 'Collect consultants client insights after project delivery',
    system: 'CRM Client Tab "Update"', kpi: '# insights shared', tiers: ['key', 'core', 'opp'] },
  // BUSINESS DEVELOPMENT & GROWTH
  { id: 16, group: 'Business Development & Growth',     name: 'Request references',
    def: 'Request references/additional contacts after successful projects',
    system: 'CRM Contact Tab', kpi: '# references obtained', tiers: ['key', 'core', 'opp'] },
  { id: 17, group: 'Business Development & Growth',     name: 'Opportunities identification',
    def: 'Identify additional scopes or future needs outside current scope of delivered services. Create Leads on CRM',
    system: 'CRM Client Tab "Update"', kpi: '# follow-on leads', tiers: ['key', 'core', 'opp'] },
  { id: 18, group: 'Business Development & Growth',     name: 'Cross-entity introductions within Client group',
    def: 'Secure introductions within client group: Affiliates reach',
    system: 'CRM MOM Tab', kpi: '# internal introductions', tiers: ['key'] },
  { id: 19, group: 'Business Development & Growth',     name: 'Introduction of Dolfines services (cross-selling)',
    def: 'Promote and present other Dolfines services to the client',
    system: 'CRM MOM Tab', kpi: '# services presented', tiers: ['key'] },
  { id: 20, group: 'Business Development & Growth',     name: 'Leads and opportunity tracking',
    def: 'Track prospects number and conversion rate',
    system: 'CRM dashboards', kpi: 'Conversion rate', tiers: ['key', 'core', 'opp'] },
  // COMMERCIAL & CONTRACTS
  { id: 21, group: 'Commercial & Contracts',            name: 'Proposal strategy & pricing',
    def: 'Define pricing logic positioning and proposal strategy',
    system: 'CRM Update Tab', kpi: 'Proposal win rate', tiers: ['key', 'core', 'opp'] },
  { id: 22, group: 'Commercial & Contracts',            name: 'Negotiation support',
    def: 'Support major negotiations',
    system: 'N/A', kpi: 'Proposal win rate', tiers: ['key', 'core', 'opp'] },
  { id: 23, group: 'Commercial & Contracts',            name: 'Framework contracts',
    def: 'Identify framework or long-term agreements',
    system: 'CRM Sales Proposal Tab', kpi: '# LTAs signed', tiers: ['key', 'core', 'opp'] },
  { id: 24, group: 'Commercial & Contracts',            name: 'Procurement registration',
    def: 'Ensure registration on procurement and e-platforms and access to tenders',
    system: 'CRM Client Tab', kpi: '% services registered', tiers: ['key', 'core', 'opp'] },
  // OPERATIONS & TRACKING
  { id: 25, group: 'Operations & Tracking',             name: 'CRM update & reporting',
    def: 'Maintain accurate CRM data',
    system: 'CRM', kpi: 'CRM completeness', tiers: ['key', 'core', 'opp'] },
];

const ACTION_GROUPS = [...new Set(ACTIONS.map(a => a.group))];

// ── ICP Criteria ─────────────────────────────────────
const ICP_CRITERIA = [
  {
    key: 'industry', label: 'Industry / Secteur',
    options: [
      { value: 'Civil Engineering', score: 6 }, { value: 'Oil & Gas', score: 9 },
      { value: 'Environmental Services', score: 8 }, { value: 'Electrical/Electronic Manufacturing', score: 6 },
      { value: 'Consumer Electronics', score: 8 }, { value: 'Defense & Space', score: 5 },
      { value: 'Construction', score: 4 }, { value: 'Aviation & Aerospace', score: 6 },
      { value: 'Automotive', score: 6 }, { value: 'Government Administration', score: 5 },
      { value: 'Other', score: 3 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'geography', label: 'Geography / G\u00e9ographie',
    options: [
      { value: 'France', score: 10 }, { value: 'UAE / Middle East', score: 9 },
      { value: 'Europe (hors France)', score: 7 }, { value: 'Africa', score: 7 },
      { value: 'Asia Pacific', score: 5 }, { value: 'Americas', score: 4 },
      { value: 'Other', score: 3 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'companySize', label: 'Company Size / Taille de l\'entreprise',
    options: [
      { value: '1-10 employees', score: 3 }, { value: '11-50 employees', score: 4 },
      { value: '51-200 employees', score: 6 }, { value: '201-500 employees', score: 7 },
      { value: '501-1000 employees', score: 8 }, { value: '1001-5000 employees', score: 9 },
      { value: '5001-10,000 employees', score: 9 }, { value: '10,001+ employees', score: 10 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'clv', label: 'Budget / Client Lifetime Value',
    options: [
      { value: 'Below $20k', score: 2 }, { value: '$20k - $50k', score: 3 },
      { value: '$50k - $100k', score: 5 }, { value: '$100k - $300k', score: 7 },
      { value: '$300k - $500k', score: 8 }, { value: '$500k - $1M', score: 10 },
      { value: '$1M and above', score: 10 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'profitMargin', label: 'Profit Margin Range',
    options: [
      { value: '0% - 5%', score: 1 }, { value: '5% - 10%', score: 2 },
      { value: '10% - 15%', score: 3 }, { value: '15% - 20%', score: 4 },
      { value: '20% - 25%', score: 5 }, { value: '25% - 30%', score: 6 },
      { value: '30% - 35%', score: 7 }, { value: '35% - 40%', score: 8 },
      { value: '40% - 45%', score: 9 }, { value: '45% - 50%', score: 10 },
      { value: 'Over 50%', score: 10 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'buyingProcess', label: 'Buying Process',
    options: [
      { value: 'Simple, direct procurement process (few hurdles)', score: 3 },
      { value: 'Moderate complexity (e.g., RFPs or multiple vendor comparisons)', score: 2 },
      { value: 'Highly complex procurement (e.g., legal reviews, compliance checks, extended contracts)', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'contractNegotiation', label: 'Contract Negotiation Preferences',
    options: [
      { value: 'Quick, flexible negotiations (minimal revisions)', score: 3 },
      { value: 'Moderate negotiation process (some back-and-forth but generally straightforward)', score: 2 },
      { value: 'Lengthy, detailed negotiation process (multiple revisions and legal reviews)', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'buyingCycle', label: 'Buying Cycle',
    options: [
      { value: 'Short buying cycle (quick decisions within weeks)', score: 3 },
      { value: 'Average buying cycle (decisions within 1-3 months)', score: 2 },
      { value: 'Long buying cycle (decisions take over 3 months)', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'budgetApproval', label: 'Budget Approval Process',
    options: [
      { value: 'Fast and flexible approval process', score: 3 },
      { value: 'Moderate approval timeline with some bureaucratic steps', score: 2 },
      { value: 'Slow or highly restrictive approval process', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'paymentTerms', label: 'Payment Terms',
    options: [
      { value: 'Pays on time or early, flexible with terms', score: 3 },
      { value: 'Occasional delays but generally reliable', score: 2 },
      { value: 'Frequent delays, difficult negotiations on payment terms', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'decisionMakers', label: 'Decision Makers (Job Title)',
    options: [
      { value: 'CEO (Chief Executive Officer)', score: 10 }, { value: 'CFO (Chief Financial Officer)', score: 9 },
      { value: 'CTO (Chief Technology Officer)', score: 8 }, { value: 'COO (Chief Operating Officer)', score: 8 },
      { value: 'President', score: 9 }, { value: 'Vice President', score: 8 },
      { value: 'Director', score: 7 }, { value: 'Manager', score: 7 },
      { value: 'Supervisor', score: 5 }, { value: 'Other', score: 4 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'accessToDecisionMakers', label: 'Access to Decision Makers',
    options: [
      { value: 'High access to decision-makers (e.g., C-suite involvement)', score: 3 },
      { value: 'Mid-level access (e.g., senior managers or department heads)', score: 2 },
      { value: 'Low access (e.g., long approval chains or heavy bureaucracy)', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'riskTolerance', label: 'Risk Tolerance in Decision Making',
    options: [
      { value: 'High risk tolerance (open to new ideas, fast decisions)', score: 3 },
      { value: 'Moderate risk tolerance (careful, but willing to move forward after due diligence)', score: 2 },
      { value: 'Low risk tolerance (slow decision-making, require extensive proof of value)', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'businessGoals', label: 'Business Goals',
    options: [
      { value: 'Revenue growth', score: 9 }, { value: 'Profitability', score: 9 },
      { value: 'Market expansion', score: 8 }, { value: 'Customers satisfaction and retention', score: 8 },
      { value: 'Innovation and product development', score: 7 }, { value: 'Operational efficiency', score: 8 },
      { value: 'Digital transformation', score: 8 }, { value: 'Risk management and compliance', score: 7 },
      { value: 'Sustainability and CSR', score: 6 }, { value: 'Other', score: 5 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'painPoints', label: 'Common Pain Points',
    options: [
      { value: 'Operational challenges', score: 9 }, { value: 'Financial challenges', score: 8 },
      { value: 'Productivity challenges', score: 8 }, { value: 'Quality challenges', score: 9 },
      { value: 'Communication challenges', score: 7 }, { value: 'Integration challenges', score: 7 },
      { value: 'Complexity challenges', score: 7 }, { value: 'Time-related challenges', score: 9 },
      { value: 'Customer service challenges', score: 7 }, { value: 'Other', score: 5 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'desiredOutcomes', label: 'Desired Outcomes',
    options: [
      { value: 'Efficiency and Time Savings', score: 9 }, { value: 'Cost Savings and Return on Investment', score: 8 },
      { value: 'Increased Productivity and Performance', score: 9 }, { value: 'Improved Quality and Reliability', score: 10 },
      { value: 'Enhanced User Experience and Satisfaction', score: 7 }, { value: 'Simplified Processes and Reduced Complexity', score: 8 },
      { value: 'Customization and Personalization', score: 6 }, { value: 'Competitive Advantage and Differentiation', score: 7 },
      { value: 'Enhanced Communication and Collaboration', score: 6 }, { value: 'Scalability and Future-Proofing', score: 8 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'serviceExpectations', label: 'Service Expectations',
    options: [
      { value: 'Quality', score: 10 }, { value: 'Reliability', score: 9 },
      { value: 'Communication', score: 8 }, { value: 'Responsiveness', score: 7 },
      { value: 'Cost-effectiveness', score: 6 }, { value: 'Innovation', score: 6 },
      { value: 'Flexibility', score: 7 }, { value: 'Transparency', score: 8 },
      { value: 'Partnership', score: 7 }, { value: 'Trustworthiness', score: 9 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'purchaseCriteria', label: 'Purchase Decision Priorities',
    options: [
      { value: 'Price', score: 3 }, { value: 'Quality', score: 10 },
      { value: 'Brand Reputation', score: 6 }, { value: 'Customer Reviews and Recommendations', score: 5 },
      { value: 'Personalized Experience', score: 4 }, { value: 'Convenience and Accessibility', score: 3 },
      { value: 'Product Features and Benefits', score: 8 }, { value: 'Trust and Security', score: 9 },
      { value: 'Social and Environmental Impact', score: 2 }, { value: 'Customer Service', score: 7 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'satisfactionLevel', label: 'Satisfaction Levels (with Dolfines)',
    options: [
      { value: 'Very Dissatisfied', score: 1 }, { value: 'Dissatisfied', score: 2 },
      { value: 'Neutral', score: 3 }, { value: 'Satisfied', score: 4 },
      { value: 'Very Satisfied', score: 5 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'relationshipLevel', label: 'Relationship Levels (with Dolfines)',
    options: [
      { value: 'Effortless', score: 5 }, { value: 'Manageable', score: 4 },
      { value: 'Challenging', score: 3 }, { value: 'Difficult', score: 2 },
      { value: 'Extremely Difficult', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
  {
    key: 'ltRelationshipPotential', label: 'Long-Term Relationship Potential',
    options: [
      { value: 'Strong potential for ongoing work and repeat business', score: 3 },
      { value: 'Some potential for future projects', score: 2 },
      { value: 'One-off project, little potential for long-term relationship', score: 1 },
    ],
    importanceOptions: [
      { value: 'Very Important', score: 3 }, { value: 'Somewhat Important', score: 2 }, { value: 'Not Very Important', score: 1 }
    ]
  },
];

// ── Toast Notifications ──────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const colors = { success: '#2ea84b', error: '#d63031', info: '#0984e3', warning: '#f0aa00' };
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${colors[type] || colors.info};
    color:white; padding:12px 20px; border-radius:8px;
    font-size:14px; font-weight:600; box-shadow:0 4px 16px rgba(0,0,0,.3);
    animation: slideIn .25s ease; max-width:360px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Confirm Dialog ───────────────────────────────────
function confirmAction(message) {
  return window.confirm(message);
}
