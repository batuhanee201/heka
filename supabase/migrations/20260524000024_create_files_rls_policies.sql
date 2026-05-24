-- ── files ───────────────────────────────────────────────────────────
CREATE POLICY "files_select_public" ON public.files
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);

CREATE POLICY "files_select_own" ON public.files
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "files_select_manager" ON public.files
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager')
  );

CREATE POLICY "files_insert_auth" ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "files_update_own" ON public.files
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "files_update_admin" ON public.files
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── file_relations ──────────────────────────────────────────────────
CREATE POLICY "fr_select_auth" ON public.file_relations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.files f
      WHERE f.id = file_id
        AND (f.is_public = true OR f.uploaded_by = auth.uid())
        AND f.deleted_at IS NULL
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager')
  );

CREATE POLICY "fr_insert_manager" ON public.file_relations
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));

CREATE POLICY "fr_delete_manager" ON public.file_relations
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','manager'));
