-- ── users ──────────────────────────────────────────────────────────
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND deleted_at IS NULL);

CREATE POLICY "users_insert_service" ON public.users
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ── roles ──────────────────────────────────────────────────────────
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "roles_insert_admin" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "roles_update_admin" ON public.roles
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND is_system = false);

CREATE POLICY "roles_delete_admin" ON public.roles
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND is_system = false);

-- ── permissions ────────────────────────────────────────────────────
CREATE POLICY "permissions_select_auth" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permissions_insert_admin" ON public.permissions
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "permissions_update_admin" ON public.permissions
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "permissions_delete_admin" ON public.permissions
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── user_roles ─────────────────────────────────────────────────────
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── role_permissions ───────────────────────────────────────────────
CREATE POLICY "role_permissions_select_auth" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "role_permissions_insert_admin" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "role_permissions_delete_admin" ON public.role_permissions
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── sessions ───────────────────────────────────────────────────────
CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sessions_select_admin" ON public.sessions
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "sessions_insert_service" ON public.sessions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "sessions_update_service" ON public.sessions
  FOR UPDATE TO service_role
  USING (revoked_at IS NULL);

-- ── otp_verifications ──────────────────────────────────────────────
CREATE POLICY "otp_select_admin" ON public.otp_verifications
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "otp_insert_service" ON public.otp_verifications
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "otp_update_service" ON public.otp_verifications
  FOR UPDATE TO service_role
  USING (true);

-- ── rate_limit_logs ────────────────────────────────────────────────
CREATE POLICY "rate_limit_select_admin" ON public.rate_limit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "rate_limit_insert_service" ON public.rate_limit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "rate_limit_update_service" ON public.rate_limit_logs
  FOR UPDATE TO service_role
  USING (true);
