#!/usr/bin/env bash
# Export shop.db tables to CSV files ready for PostgreSQL COPY import.
# Boolean INTEGER columns (0/1) are converted to true/false.
set -euo pipefail

DB="/Users/skylersmith/Downloads/shop.db"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$SCRIPT_DIR/../supabase/seed_data"

if [ ! -f "$DB" ]; then
  echo "Error: database not found at $DB" >&2
  exit 1
fi

mkdir -p "$OUT"

echo "Exporting customers..."
sqlite3 "$DB" -csv -header \
  "SELECT customer_id, full_name, email, gender, birthdate, created_at,
          city, state, zip_code, customer_segment, loyalty_tier,
          CASE is_active WHEN 1 THEN 'true' ELSE 'false' END AS is_active
   FROM customers;" > "$OUT/customers.csv"

echo "Exporting products..."
sqlite3 "$DB" -csv -header \
  "SELECT product_id, sku, product_name, category, price, cost,
          CASE is_active WHEN 1 THEN 'true' ELSE 'false' END AS is_active
   FROM products;" > "$OUT/products.csv"

echo "Exporting orders..."
sqlite3 "$DB" -csv -header \
  "SELECT order_id, customer_id, order_datetime, billing_zip, shipping_zip,
          shipping_state, payment_method, device_type, ip_country,
          CASE promo_used WHEN 1 THEN 'true' ELSE 'false' END AS promo_used,
          promo_code, order_subtotal, shipping_fee, tax_amount, order_total,
          risk_score,
          CASE is_fraud WHEN 1 THEN 'true' ELSE 'false' END AS is_fraud
   FROM orders;" > "$OUT/orders.csv"

echo "Exporting order_items..."
sqlite3 "$DB" -csv -header \
  "SELECT order_item_id, order_id, product_id, quantity, unit_price, line_total
   FROM order_items;" > "$OUT/order_items.csv"

echo "Exporting shipments..."
sqlite3 "$DB" -csv -header \
  "SELECT shipment_id, order_id, ship_datetime, carrier, shipping_method,
          distance_band, promised_days, actual_days,
          CASE late_delivery WHEN 1 THEN 'true' ELSE 'false' END AS late_delivery
   FROM shipments;" > "$OUT/shipments.csv"

echo "Exporting product_reviews..."
sqlite3 "$DB" -csv -header \
  "SELECT review_id, customer_id, product_id, rating, review_datetime, review_text
   FROM product_reviews;" > "$OUT/product_reviews.csv"

echo ""
echo "Export complete. Files written to $OUT:"
wc -l "$OUT"/*.csv
