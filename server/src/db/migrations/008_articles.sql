-- Beauty guides ("Conseils"): editorial pages that answer what shoppers search for
-- ("routine coréenne peau grasse"…) and link to the products they recommend.
CREATE TABLE IF NOT EXISTS articles (
  id           SERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        JSONB NOT NULL,
  excerpt      JSONB NOT NULL DEFAULT '{}',
  body         JSONB NOT NULL DEFAULT '{}',
  cover_url    TEXT,
  product_ids  INT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(is_published, published_at DESC);
