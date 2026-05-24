-- admin → tüm izinler
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- manager → product, catalog, files izinleri
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'manager'
  AND p.code IN (
    'product.create','product.read','product.update','product.delete',
    'catalog.create','catalog.read','catalog.update','catalog.delete',
    'files.upload','files.delete'
  )
ON CONFLICT DO NOTHING;

-- viewer → yalnızca okuma izinleri
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'viewer'
  AND p.code IN ('product.read','catalog.read')
ON CONFLICT DO NOTHING;
