-- Optional sizes per product (e.g. 50 ml / 150 ml), each with its own stock and optional price.
-- sizes: [{"label": "50 ml", "price": 180 | null, "stock": 12, "enabled": true}]
-- When has_sizes is on, products.stock is kept equal to the sum of the enabled sizes' stock.
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Expiry date of the batch currently in stock (shown in the admin statistics)
ALTER TABLE products ADD COLUMN IF NOT EXISTS expires_at DATE;

-- Size chosen by the customer for this line (NULL for products without sizes)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size TEXT;

CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);
