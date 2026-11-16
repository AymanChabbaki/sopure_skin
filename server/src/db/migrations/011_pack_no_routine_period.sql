ALTER TABLE packs DROP CONSTRAINT packs_routine_period_check;
ALTER TABLE packs ALTER COLUMN routine_period SET DEFAULT 'none';
ALTER TABLE packs ADD CONSTRAINT packs_routine_period_check
  CHECK (routine_period IN ('none', 'any', 'morning', 'night'));
