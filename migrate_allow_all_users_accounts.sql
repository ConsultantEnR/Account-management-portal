-- Migration SQL pour assurer que la colonne assigned_user_ids existe
-- et que les comptes sont visibles uniquement par les utilisateurs assignés.
-- À exécuter dans Supabase SQL Editor si la table accounts existe déjà.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER POLICY "users_own_accounts" ON public.accounts
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  );
