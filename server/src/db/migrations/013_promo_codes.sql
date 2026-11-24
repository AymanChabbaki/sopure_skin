-- Promo codes, configured in the admin and applied at checkout (the server always recomputes the discount)
CREATE TABLE IF NOT EXISTS promo_codes (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,              -- stored uppercase, matched case-insensitively
  type          TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'shipping')),
  value         NUMERIC(10,2) NOT NULL DEFAULT 0,  -- % for percent, DH for fixed, unused for free delivery
  min_subtotal  NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses      INT,                               -- NULL = unlimited
  uses          INT NOT NULL DEFAULT 0,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- total = subtotal + shipping_fee - discount
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0;
