INSERT INTO public.roles (name, description, is_system) VALUES
  ('admin',   'Tam sistem erişimi',        true),
  ('manager', 'Ürün/katalog yönetimi',     true),
  ('viewer',  'Yalnızca okuma erişimi',    true)
ON CONFLICT (name) DO NOTHING;
