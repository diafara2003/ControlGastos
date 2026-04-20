INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Papas', 'baby', '#F472B6', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Papas'
);

INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Cadenas', 'wallet', '#A78BFA', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Cadenas'
);
