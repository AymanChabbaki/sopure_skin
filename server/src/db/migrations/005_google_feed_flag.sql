-- Products can be kept out of the Google Merchant feed (e.g. prescription-only items Google Shopping forbids)
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_google_feed BOOLEAN NOT NULL DEFAULT true;
