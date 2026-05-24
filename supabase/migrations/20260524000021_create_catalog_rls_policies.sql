-- ── catalogs ────────────────────────────────────────────────────────
CREATE POLICY "catalogs_select_viewer" ON public.catalogs
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND status = 'active');

CREATE POLICY "catalogs_select_manager" ON public.catalogs
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "catalogs_insert_manager" ON public.catalogs
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "catalogs_update_manager" ON public.catalogs
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

CREATE POLICY "catalogs_update_admin" ON public.catalogs
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── catalog_items ───────────────────────────────────────────────────
CREATE POLICY "ci_select_auth" ON public.catalog_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.catalogs c
      WHERE c.id = catalog_id AND c.deleted_at IS NULL AND c.status = 'active'
    )
  );

CREATE POLICY "ci_insert_manager" ON public.catalog_items
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "ci_update_manager" ON public.catalog_items
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "ci_delete_manager" ON public.catalog_items
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

-- ── pricing ─────────────────────────────────────────────────────────
CREATE POLICY "pricing_select_auth" ON public.pricing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.deleted_at IS NULL AND p.status = 'active'
    )
    AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_to   IS NULL OR valid_to   >= CURRENT_DATE)
  );

CREATE POLICY "pricing_select_manager" ON public.pricing
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "pricing_insert_manager" ON public.pricing
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "pricing_update_admin" ON public.pricing
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
