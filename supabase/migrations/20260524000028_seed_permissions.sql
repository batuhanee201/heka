INSERT INTO public.permissions (code, description, module) VALUES
  ('auth.manage_users',  'Kullanıcı yönetimi',       'auth'),
  ('product.create',     'Ürün oluşturma',            'product'),
  ('product.read',       'Ürün okuma',                'product'),
  ('product.update',     'Ürün güncelleme',           'product'),
  ('product.delete',     'Ürün soft-delete',          'product'),
  ('catalog.create',     'Katalog oluşturma',         'catalog'),
  ('catalog.read',       'Katalog okuma',             'catalog'),
  ('catalog.update',     'Katalog güncelleme',        'catalog'),
  ('catalog.delete',     'Katalog soft-delete',       'catalog'),
  ('files.upload',       'Dosya yükleme',             'files'),
  ('files.delete',       'Dosya silme',               'files'),
  ('audit.read',         'Audit log okuma',           'audit')
ON CONFLICT (code) DO NOTHING;
