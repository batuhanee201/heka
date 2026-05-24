-- ── audit_logs ──────────────────────────────────────────────────────
-- Admin tüm logları okur
CREATE POLICY "audit_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Manager yalnızca data ve file kategorisindeki logları okur
CREATE POLICY "audit_select_manager_data" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager'
    AND event_category IN ('data','file')
  );

-- Yalnızca service_role log yazabilir
CREATE POLICY "audit_insert_service" ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE ve DELETE politikası kasıtlı olarak tanımlanmadı — kayıtlar değiştirilemez
