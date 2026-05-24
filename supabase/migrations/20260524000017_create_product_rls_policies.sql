-- ── brands ──────────────────────────────────────────────────────────
CREATE POLICY "brands_select_auth" ON public.brands
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "brands_insert_manager" ON public.brands
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "brands_update_manager" ON public.brands
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

CREATE POLICY "brands_update_admin" ON public.brands
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── categories ──────────────────────────────────────────────────────
CREATE POLICY "categories_select_auth" ON public.categories
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "categories_insert_manager" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "categories_update_manager" ON public.categories
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── products ────────────────────────────────────────────────────────
CREATE POLICY "products_select_viewer" ON public.products
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND status = 'active');

CREATE POLICY "products_select_manager" ON public.products
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "products_select_admin_all" ON public.products
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "products_insert_manager" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "products_update_manager" ON public.products
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── product_technical_details ───────────────────────────────────────
CREATE POLICY "ptd_select_auth" ON public.product_technical_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.deleted_at IS NULL AND p.status = 'active'
    )
  );

CREATE POLICY "ptd_select_manager" ON public.product_technical_details
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "ptd_insert_manager" ON public.product_technical_details
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "ptd_update_manager" ON public.product_technical_details
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

-- ── product_display ─────────────────────────────────────────────────
CREATE POLICY "pd_select_auth" ON public.product_display
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.deleted_at IS NULL AND p.status = 'active'
    )
  );

CREATE POLICY "pd_select_manager" ON public.product_display
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "pd_insert_manager" ON public.product_display
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "pd_update_manager" ON public.product_display
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));
