-- So Pure Skin - initial schema
-- Translatable fields are stored as JSONB: {"fr": "...", "en": "...", "ar": "..."}

-- pg_trgm speeds up product search; skipped if the host does not allow extensions
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm unavailable, search index skipped';
END $$;

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url    TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- kind: 'type' (toner, serum...) or 'routine' (skin-type routines)
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'type' CHECK (kind IN ('type', 'routine')),
  name        JSONB NOT NULL,
  description JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url   TEXT,
  position    INT NOT NULL DEFAULT 0,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id                SERIAL PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  sku               TEXT,
  brand_id          INT REFERENCES brands(id) ON DELETE SET NULL,
  name              JSONB NOT NULL,
  short_description JSONB NOT NULL DEFAULT '{}'::jsonb,
  description       JSONB NOT NULL DEFAULT '{}'::jsonb,
  how_to_use        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingredients       JSONB NOT NULL DEFAULT '{}'::jsonb,
  price             NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price  NUMERIC(10,2),
  stock             INT NOT NULL DEFAULT 100,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_new            BOOLEAN NOT NULL DEFAULT false,
  sales_count       INT NOT NULL DEFAULT 0,
  meta_title        JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_description  JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_id         TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin ((name->>'fr') gin_trgm_ops);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  thumb_url  TEXT NOT NULL,
  storage_key TEXT,
  alt        TEXT,
  position   INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id, position);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE INDEX IF NOT EXISTS product_categories_cat_idx ON product_categories(category_id);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  number         TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  city           TEXT NOT NULL,
  address        TEXT NOT NULL,
  notes          TEXT,
  locale         TEXT NOT NULL DEFAULT 'fr',
  items_count    INT NOT NULL,
  subtotal       NUMERIC(10,2) NOT NULL,
  shipping_fee   NUMERIC(10,2) NOT NULL,
  total          NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned')),
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  image_url   TEXT,
  unit_price  NUMERIC(10,2) NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  line_total  NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Key/value store for everything the admin can tune (shipping, topbar, hero, contact...)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  locale     TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
