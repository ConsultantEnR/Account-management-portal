-- =====================================================
-- Migration : accès admin pour PDG et Head of Strategy & Sales
-- adrien.bourdon@dolfines.com  (PDG)
-- pierre.develay@dolfines.com  (Head of Strategy & Sales)
-- alexia.leclerc@dolfines.com
--
-- Ces deux utilisateurs voient l'ensemble des comptes et contacts.
-- Approche : flag app_metadata.role = 'admin' + RLS adaptée.
-- =====================================================

-- 1. Marquer les deux utilisateurs comme admins
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email IN (
  'adrien.bourdon@dolfines.com',
  'pierre.develay@dolfines.com',
  'alexia.leclerc@dolfines.com'
);

-- 2. RLS accounts : owner, assigné, OU admin
DROP POLICY IF EXISTS "users_own_accounts" ON public.accounts;
CREATE POLICY "users_own_accounts"
  ON public.accounts
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 3. RLS contacts : owner, assigné, OU admin
DROP POLICY IF EXISTS "users_own_contacts" ON public.contacts;
CREATE POLICY "users_own_contacts"
  ON public.contacts
  FOR ALL
  USING (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = ANY (assigned_user_ids)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
