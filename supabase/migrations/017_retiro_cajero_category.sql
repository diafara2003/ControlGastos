-- Add "Retiro cajero" category for all existing users who don't have it
INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, 'Retiro cajero', 'landmark', '#78716C', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = 'Retiro cajero'
);

-- Also update the default trigger to include Retiro cajero for new users
-- (This requires updating the trigger function in 001_initial_schema.sql)
