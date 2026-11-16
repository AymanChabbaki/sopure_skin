ALTER TABLE packs ADD COLUMN routine_period TEXT NOT NULL DEFAULT 'any'
  CHECK (routine_period IN ('any', 'morning', 'night'));
