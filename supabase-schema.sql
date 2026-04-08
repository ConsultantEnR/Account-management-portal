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
