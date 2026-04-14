-- =====================================================
-- DOLFINES ACCOUNT MANAGEMENT PORTAL
-- Schéma Supabase – à exécuter dans SQL Editor
-- =====================================================

-- 1. Table des comptes
CREATE TABLE IF NOT EXISTS public.accounts (
  id              TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name    TEXT        NOT NULL,
  tier            TEXT,
  icp_score       INTEGER,
  icp_fit         TEXT,
  icp_selections  JSONB,
  account_owner   TEXT,
  last_updated    DATE,
  review_date     DATE,
  target          NUMERIC,
  achieved        NUMERIC,
  comments        TEXT,
  actions         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Row Level Security (chaque user voit uniquement ses comptes)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_accounts"
  ON public.accounts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);

-- =====================================================
-- 4. Table des contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id              TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  account_manager TEXT,
  email           TEXT,
  phone           TEXT,
  position        TEXT,
  company         TEXT,
  notes           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Row Level Security pour contacts (chaque user voit uniquement ses contacts)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_contacts"
  ON public.contacts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON public.contacts (user_id);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON public.contacts (name);

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- Après avoir exécuté ce script :
--
-- 1. Allez dans Authentication > Users > "Invite user"
--    pour chaque adresse email :
--      dylan.charron@dolfines.com
--      hend.othmani@dolfines.com
--      ines.dechaut@aegide-international.com
--      laetitia.dapremont@aegide-international.com
--      nicolas.lecoeur@8p2.fr
--      richard.musi@8p2.fr
--      pierre.develay@dolfines.com
--      hugo.pagola@aegide-international.com
--      raphael.gabriels@dolfines.com
--      khalil.badri@aegide-international.com
--      julia.lefloch@aegide-international.com
--      dimitri.fay@dolfines.com
--
-- 2. OU utilisez ce script pour créer les utilisateurs
--    directement (nécessite service_role, à exécuter
--    côté serveur / Supabase Edge Function) :
--
-- SELECT auth.create_user(
--   '{"email": "dylan.charron@dolfines.com",
--     "password": "Dolfines2026!",
--     "user_metadata": {"full_name": "Dylan Charron"}}'::jsonb
-- );
-- (répéter pour chaque utilisateur)
-- =====================================================
