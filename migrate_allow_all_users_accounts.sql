-- Migration SQL pour assurer que la colonne assigned_user_ids existe
-- et que les comptes sont visibles uniquement par les utilisateurs assignés.
-- À exécuter dans Supabase SQL Editor si la table accounts existe déjà.

-- 1. Ajouter la colonne assigned_user_ids si absente
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

-- 2. Ajouter la colonne assigned_user_ids sur contacts si absente
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

-- 3. Politique RLS accounts : owner OU utilisateur assigné
DROP POLICY IF EXISTS "users_own_accounts" ON public.accounts;
CREATE POLICY "users_own_accounts"
  ON public.accounts
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  );

-- 4. Politique RLS contacts : owner OU utilisateur assigné
DROP POLICY IF EXISTS "users_own_contacts" ON public.contacts;
CREATE POLICY "users_own_contacts"
  ON public.contacts
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  );

-- 5. Index GIN pour les recherches sur assigned_user_ids (accounts)
CREATE INDEX IF NOT EXISTS accounts_assigned_user_ids_idx
  ON public.accounts USING GIN (assigned_user_ids);

-- 6. Index GIN pour les recherches sur assigned_user_ids (contacts)
CREATE INDEX IF NOT EXISTS contacts_assigned_user_ids_idx
  ON public.contacts USING GIN (assigned_user_ids);
