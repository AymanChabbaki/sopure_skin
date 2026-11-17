ALTER TABLE pack_items ADD COLUMN routine_period TEXT
  CHECK (routine_period IN ('morning', 'night', 'both'));
