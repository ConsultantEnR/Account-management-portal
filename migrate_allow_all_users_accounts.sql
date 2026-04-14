-- Migration SQL pour autoriser tous les utilisateurs authentifiés à lire et modifier les comptes.
-- À exécuter dans Supabase SQL Editor si la table accounts existe déjà.

ALTER POLICY "users_own_accounts" ON public.accounts
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
  );
