-- Add "Pago tarjeta crédito" category for all existing users
INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Pago tarjeta crédito', 'credit-card', '#0EA5E9', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Pago tarjeta crédito'
);
