// Import shop.db CSV data into Supabase via the REST API.
// Usage: node scripts/import-data.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local,
// or set them as environment variables.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../supabase/seed_data");

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://njpbxeascovgmcpcwumq.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error("Error: set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Simple CSV parser (handles quoted fields) ──────────────────────
function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const row = {};
    headers.forEach((h, i) => {
      const v = values[i];
      if (v === undefined || v === "") {
        row[h] = null;
      } else if (v === "true") {
        row[h] = true;
      } else if (v === "false") {
        row[h] = false;
      } else if (/^-?\d+$/.test(v)) {
        row[h] = parseInt(v, 10);
      } else if (/^-?\d+\.\d+$/.test(v)) {
        row[h] = parseFloat(v);
      } else {
        row[h] = v;
      }
    });
    return row;
  });
}

// ── Batch insert ───────────────────────────────────────────────────
const BATCH_SIZE = 500;

async function importTable(tableName) {
  const csvPath = resolve(SEED_DIR, `${tableName}.csv`);
  const text = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(text);

  console.log(`  ${tableName}: ${rows.length} rows`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) {
      console.error(
        `  ERROR in ${tableName} (rows ${i}-${i + batch.length}):`,
        error.message
      );
      return false;
    }
    process.stdout.write(
      `\r  ${tableName}: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`
    );
  }
  process.stdout.write(`\r  ${tableName}: ${rows.length}/${rows.length} ✓\n`);
  return true;
}

// ── Main ───────────────────────────────────────────────────────────
const tables = [
  "customers",
  "products",
  "orders",
  "order_items",
  "shipments",
  "product_reviews",
];

console.log("Importing data to Supabase via REST API...\n");

let allOk = true;
for (const table of tables) {
  const ok = await importTable(table);
  if (!ok) allOk = false;
}

if (allOk) {
  console.log("\nAll data imported successfully.");
  console.log(
    "\nIMPORTANT: Paste this SQL in the Supabase SQL Editor to reset sequences:"
  );
  console.log(`
SELECT setval('customers_customer_id_seq',     (SELECT MAX(customer_id)    FROM customers));
SELECT setval('products_product_id_seq',       (SELECT MAX(product_id)     FROM products));
SELECT setval('orders_order_id_seq',           (SELECT MAX(order_id)       FROM orders));
SELECT setval('order_items_order_item_id_seq', (SELECT MAX(order_item_id)  FROM order_items));
SELECT setval('shipments_shipment_id_seq',     (SELECT MAX(shipment_id)    FROM shipments));
SELECT setval('product_reviews_review_id_seq', (SELECT MAX(review_id)      FROM product_reviews));
  `);
} else {
  console.error("\nSome tables had errors. Check output above.");
  process.exit(1);
}
