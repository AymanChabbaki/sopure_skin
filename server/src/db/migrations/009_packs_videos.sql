-- Routine packs: a named selection of products, shown on the routines it is attached to.
-- A product can belong to several packs.
CREATE TABLE IF NOT EXISTS packs (
  id          SERIAL PRIMARY KEY,
  name        JSONB NOT NULL,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pack_items (
  pack_id    INT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_id, product_id)
);
CREATE INDEX IF NOT EXISTS pack_items_product_idx ON pack_items(product_id);

-- Routines (categories) where the pack is offered
CREATE TABLE IF NOT EXISTS pack_categories (
  pack_id     INT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (pack_id, category_id)
);
CREATE INDEX IF NOT EXISTS pack_categories_category_idx ON pack_categories(category_id);

-- Videos shown in the home page video section
CREATE TABLE IF NOT EXISTS videos (
  id          SERIAL PRIMARY KEY,
  title       JSONB NOT NULL DEFAULT '{}'::jsonb,
  url         TEXT NOT NULL,
  storage_key TEXT,
  poster_url  TEXT,
  poster_key  TEXT,
  -- Optional product shown with the video ("Acheter")
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
