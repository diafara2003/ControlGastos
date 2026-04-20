-- Add credit categories for all existing users
INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Crédito vehículo', 'car', '#7C3AED', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Crédito vehículo'
);

INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Crédito hipotecario', 'home', '#0D9488', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Crédito hipotecario'
);
