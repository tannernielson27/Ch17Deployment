# Database Contract

## Golden Rule

> **The AI agent must not invent new tables.**
> Only use tables that already exist in `shop.db`.
> If your actual column names differ from the ones below, update every prompt accordingly.

---

## Assumed Schema

These are the expected tables and columns based on the ML pipeline that produced `shop.db`.
Verify against your actual database using the `/debug/schema` page (see Prompt 0.5 in `prompts.md`).

### `customers`

| Column | Type | Notes |
|---|---|---|
| `customer_id` | INTEGER | Primary key |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `email` | TEXT | |

### `products`

| Column | Type | Notes |
|---|---|---|
| `product_id` | INTEGER | Primary key |
| `product_name` | TEXT | |
| `price` | REAL | Unit price |

### `orders`

| Column | Type | Notes |
|---|---|---|
| `order_id` | INTEGER | Primary key |
| `customer_id` | INTEGER | FK → customers |
| `order_timestamp` | TEXT | ISO 8601 datetime |
| `fulfilled` | INTEGER | 0 = pending, 1 = fulfilled |
| `total_value` | REAL | Sum of line item totals |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `order_item_id` | INTEGER | Primary key |
| `order_id` | INTEGER | FK → orders |
| `product_id` | INTEGER | FK → products |
| `quantity` | INTEGER | |
| `unit_price` | REAL | Price at time of order |

### `order_predictions`

| Column | Type | Notes |
|---|---|---|
| `order_id` | INTEGER | PK / FK → orders |
| `late_delivery_probability` | REAL | Model output score (0–1) |
| `predicted_late_delivery` | INTEGER | 1 = predicted late, 0 = on time |
| `prediction_timestamp` | TEXT | When the inference job ran |

> `order_predictions` is written by the Python inference job (`jobs/run_inference.py`).
> The app reads it like any other table — do not modify it from the web layer.

---

## Key Queries

### Priority Queue (used on `/warehouse/priority`)

```sql
SELECT
  o.order_id,
  o.order_timestamp,
  o.total_value,
  o.fulfilled,
  c.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  p.late_delivery_probability,
  p.predicted_late_delivery,
  p.prediction_timestamp
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN order_predictions p ON p.order_id = o.order_id
WHERE o.fulfilled = 0
ORDER BY p.late_delivery_probability DESC, o.order_timestamp ASC
LIMIT 50;
```

### Customer Summary (used on `/dashboard`)

```sql
-- Order count and total spend
SELECT COUNT(*) AS order_count, SUM(total_value) AS total_spend
FROM orders
WHERE customer_id = ?;

-- 5 most recent orders
SELECT order_id, order_timestamp, fulfilled, total_value
FROM orders
WHERE customer_id = ?
ORDER BY order_timestamp DESC
LIMIT 5;
```

### Place Order (used on `/place-order`)

Run inside a single transaction:

```sql
-- 1. Insert order
INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value)
VALUES (?, datetime('now'), 0, ?);

-- 2. Insert line items (one per product)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (?, ?, ?, ?);
```

---

## Schema Verification

If you are unsure whether your actual column names match the assumed schema above,
start the dev server and visit **`/debug/schema`**. That page runs `PRAGMA table_info`
on every table and prints the real column names and types.

Adjust any SQL in the prompts to match what you see there.
