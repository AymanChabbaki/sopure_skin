-- Admin can mark a product as a best-seller (shown with a badge and in the "Best-sellers" nav link),
-- independently of its automatic sales_count ranking.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT false;
