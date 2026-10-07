-- Product reviews. Customer reviews arrive unapproved and are moderated in the admin.
-- is_sample marks generated placeholder reviews so they can be removed in one click before launch.
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  city        TEXT,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'fr',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_sample   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id, is_approved, created_at DESC);

-- Denormalized for fast listing/sorting; kept in sync by refresh_product_rating()
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_product_rating() RETURNS trigger AS $$
DECLARE pid INT := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products p SET
    rating_avg = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE product_id = pid AND is_approved), 0),
    rating_count = (SELECT count(*) FROM reviews WHERE product_id = pid AND is_approved)
  WHERE p.id = pid;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_refresh_rating ON reviews;
CREATE TRIGGER reviews_refresh_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();
