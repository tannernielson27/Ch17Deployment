#!/usr/bin/env bash
# Apply PostgreSQL schema migration and import CSV data into Supabase.
# Requires DATABASE_URL env var — find yours in:
#   Supabase dashboard → Settings → Database → Connection string → URI
#
# Usage:
#   DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
#     bash scripts/import_to_supabase.sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set." >&2
  echo "Usage: DATABASE_URL=\"postgresql://...\" bash $0" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"
SEED_DIR="$(cd "$SCRIPT_DIR/../supabase/seed_data" && pwd)"

echo "==> Applying schema migration..."
psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/20260402000000_shop_schema.sql"

# Import in FK-safe order: customers and products first, then dependent tables
echo ""
echo "==> Importing data (FK-safe order)..."

for table in customers products orders order_items shipments product_reviews; do
  CSV="$SEED_DIR/$table.csv"
  if [ ! -f "$CSV" ]; then
    echo "  Warning: $CSV not found, skipping $table" >&2
    continue
  fi
  echo "  Importing $table..."
  psql "$DATABASE_URL" -c "\COPY $table FROM '$CSV' CSV HEADER"
done

echo ""
echo "==> Resetting sequences to match imported IDs..."
psql "$DATABASE_URL" <<'SQL'
SELECT setval('customers_customer_id_seq',     (SELECT MAX(customer_id)    FROM customers));
SELECT setval('products_product_id_seq',       (SELECT MAX(product_id)     FROM products));
SELECT setval('orders_order_id_seq',           (SELECT MAX(order_id)       FROM orders));
SELECT setval('order_items_order_item_id_seq', (SELECT MAX(order_item_id)  FROM order_items));
SELECT setval('shipments_shipment_id_seq',     (SELECT MAX(shipment_id)    FROM shipments));
SELECT setval('product_reviews_review_id_seq', (SELECT MAX(review_id)      FROM product_reviews));
SQL

echo ""
echo "==> Verifying row counts..."
psql "$DATABASE_URL" <<'SQL'
SELECT 'customers'      AS "table", COUNT(*) AS rows FROM customers
UNION ALL
SELECT 'products',      COUNT(*) FROM products
UNION ALL
SELECT 'orders',        COUNT(*) FROM orders
UNION ALL
SELECT 'order_items',   COUNT(*) FROM order_items
UNION ALL
SELECT 'shipments',     COUNT(*) FROM shipments
UNION ALL
SELECT 'product_reviews', COUNT(*) FROM product_reviews;
SQL

echo ""
echo "Migration complete."
