-- Add cycle configuration to profiles
ALTER TABLE public.profiles
  ADD COLUMN cycle_start_day smallint NOT NULL DEFAULT 1
    CHECK (cycle_start_day BETWEEN 1 AND 31),
  ADD COLUMN cycle_start_hour smallint NOT NULL DEFAULT 0
    CHECK (cycle_start_hour BETWEEN 0 AND 23);
