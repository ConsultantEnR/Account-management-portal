-- =====================================================
-- Create contacts table in Supabase
-- Exécuter dans SQL Editor de Supabase
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

-- Row Level Security pour contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_contacts" ON public.contacts;
CREATE POLICY "users_own_contacts"
  ON public.contacts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON public.contacts (user_id);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON public.contacts (name);
