-- Manufacturer barcode (EAN-13 / UPC / GTIN-14). Lets Google match the product across stores
-- (Shopping, free listings, price comparisons). Empty for products without a barcode.
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin TEXT;
