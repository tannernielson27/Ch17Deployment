-- ============================================================
-- IS 455 Shop — Supabase Schema
-- Run this in the Supabase SQL Editor before importing data
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id       SERIAL PRIMARY KEY,
  full_name         TEXT,
  email             TEXT,
  gender            TEXT,
  birthdate         TEXT,
  created_at        TEXT,
  city              TEXT,
  state             TEXT,
  zip_code          TEXT,
  customer_segment  TEXT,
  loyalty_tier      TEXT,
  is_active         INTEGER
);

CREATE TABLE IF NOT EXISTS products (
  product_id    SERIAL PRIMARY KEY,
  sku           TEXT,
  product_name  TEXT,
  category      TEXT,
  price         NUMERIC,
  cost          NUMERIC,
  is_active     INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
  order_id        SERIAL PRIMARY KEY,
  customer_id     INTEGER REFERENCES customers(customer_id),
  order_datetime  TEXT,
  billing_zip     TEXT,
  shipping_zip    TEXT,
  shipping_state  TEXT,
  payment_method  TEXT,
  device_type     TEXT,
  ip_country      TEXT,
  promo_used      INTEGER,
  promo_code      TEXT,
  order_subtotal  NUMERIC,
  shipping_fee    NUMERIC,
  tax_amount      NUMERIC,
  order_total     NUMERIC,
  risk_score      NUMERIC,
  is_fraud        INTEGER
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id  SERIAL PRIMARY KEY,
  order_id       INTEGER REFERENCES orders(order_id),
  product_id     INTEGER REFERENCES products(product_id),
  quantity       INTEGER,
  unit_price     NUMERIC,
  line_total     NUMERIC
);

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id      SERIAL PRIMARY KEY,
  order_id         INTEGER REFERENCES orders(order_id),
  ship_datetime    TEXT,
  carrier          TEXT,
  shipping_method  TEXT,
  distance_band    TEXT,
  promised_days    INTEGER,
  actual_days      INTEGER,
  late_delivery    INTEGER
);

CREATE TABLE IF NOT EXISTS product_reviews (
  review_id       SERIAL PRIMARY KEY,
  customer_id     INTEGER REFERENCES customers(customer_id),
  product_id      INTEGER REFERENCES products(product_id),
  rating          INTEGER,
  review_datetime TEXT,
  review_text     TEXT
);

CREATE TABLE IF NOT EXISTS order_predictions (
  order_id                  INTEGER PRIMARY KEY REFERENCES orders(order_id),
  late_delivery_probability NUMERIC,
  predicted_late_delivery   INTEGER,
  prediction_timestamp      TEXT
);
