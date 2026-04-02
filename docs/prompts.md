# AI Agent Prompts — Paste in Order

These prompts are designed for use with **Cursor** or **Claude Code**.
Paste them one at a time. After each prompt, run the app and verify the behavior
before moving to the next prompt.

> **Before you start:** Check your real schema at `/debug/schema` (Prompt 0.5) and
> update any table or column names that differ from those used below.

---

## Prompt 0 — Project Setup (Next.js)

```
You are generating a complete student project web app using Next.js (App Router) and SQLite.

Constraints:
- No authentication. Users select an existing customer to "act as".
- Use a SQLite file named "shop.db" located at the project root (or /data/shop.db if you prefer).
- Use better-sqlite3 for DB access.
- Keep UI simple and clean.

Tasks:
1. Create a new Next.js app (App Router).
2. Add a server-side DB helper module that opens shop.db and exposes helpers for SELECT
   and INSERT/UPDATE using prepared statements.
3. Create a shared layout with navigation links:
   - Select Customer
   - Customer Dashboard
   - Place Order
   - Order History
   - Warehouse Priority Queue
   - Run Scoring
4. Provide install/run instructions (npm) and any required scripts.

Return:
- All files to create/modify
- Any commands to run
```

---

## Prompt 0.5 — Inspect the Database Schema

```
Add a developer-only page at /debug/schema that prints:
- All table names in shop.db
- For each table, the column names and types (PRAGMA table_info)

Purpose: Students can verify the real schema and adjust prompts if needed.
Keep it simple and readable.
```

> **Action:** After running this prompt and starting the server, visit `/debug/schema`.
> Compare the output to the assumed schema in `docs/database.md` and update any
> subsequent prompts where column or table names differ.

---

## Prompt 1 — Select Customer Screen

```
Add a "Select Customer" page at /select-customer.

Requirements:
1. Query the database for customers:
   - customer_id
   - first_name
   - last_name
   - email
2. Render a searchable dropdown or simple list. When a customer is selected,
   store customer_id in a cookie.
3. Redirect to /dashboard after selection.
4. Add a small banner showing the currently selected customer on every page (if set).

Deliver:
- Any new routes/components
- DB query code using better-sqlite3
- Notes on where customer_id is stored
```

**Verify:**
- [ ] `/select-customer` loads a list of real customers from `shop.db`
- [ ] Selecting a customer sets a cookie and redirects to `/dashboard`
- [ ] The banner appears on all pages after a customer is selected

---

## Prompt 2 — Customer Dashboard

```
Create a /dashboard page that shows a summary for the selected customer.

Requirements:
1. If no customer is selected, redirect to /select-customer.
2. Show:
   - Customer name and email
   - Total number of orders for the customer
   - Total spend across all orders (sum total_value)
   - A small table of the 5 most recent orders (order_id, order_timestamp, fulfilled, total_value)
3. All data must come from shop.db.

Deliver:
- SQL queries used
- Page UI implementation
```

**Verify:**
- [ ] Redirects to `/select-customer` if no customer cookie is present
- [ ] Shows correct name, email, order count, and spend
- [ ] Recent orders table is accurate

---

## Prompt 3 — Place Order Page

```
Create a /place-order page that allows creating a new order for the selected customer.

Requirements:
1. If no customer selected, redirect to /select-customer.
2. Query products (product_id, product_name, price) and let the user add 1+ line items:
   - product
   - quantity
3. On submit:
   - Insert a row into orders for this customer with fulfilled = 0 and order_timestamp = current time
   - Insert corresponding rows into order_items
   - Compute and store total_value in orders (sum price * quantity)
4. After placing, redirect to /orders and show a success message.

Constraints:
- Use a transaction for inserts.
- Keep the UI minimal (a table of line items is fine).

Deliver:
- SQL inserts
- Next.js route handlers (server actions or API routes)
- Any validation rules
```

**Verify:**
- [ ] Products load from the database
- [ ] Submitting an order creates rows in both `orders` and `order_items`
- [ ] `total_value` is correct
- [ ] Redirects to `/orders` with a success message

---

## Prompt 4 — Order History Page

```
Create a /orders page that shows order history for the selected customer.

Requirements:
1. If no customer selected, redirect to /select-customer.
2. Render a table of the customer's orders:
   - order_id, order_timestamp, fulfilled, total_value
3. Clicking an order shows /orders/[order_id] with line items:
   - product_name, quantity, unit_price, line_total
4. Keep it clean and readable.

Deliver:
- The two pages
- SQL queries
```

**Verify:**
- [ ] `/orders` lists all orders for the selected customer
- [ ] Clicking an order navigates to `/orders/[order_id]`
- [ ] Line items show correct product names and prices

---

## Prompt 5 — Warehouse Priority Queue Page

```
Create /warehouse/priority page that shows the "Late Delivery Priority Queue".

Use this SQL query exactly (adjust table/column names only if they differ in shop.db):

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

Requirements:
- Render the results in a table.
- Add a short explanation paragraph describing why this queue exists.

Deliver:
- Page code
```

**Verify:**
- [ ] Page renders without errors
- [ ] Results are ordered by `late_delivery_probability` descending
- [ ] Shows up to 50 unfulfilled orders that have predictions

> **Note:** If the table is empty, the inference job has not run yet. Proceed to Prompt 6
> and click "Run Scoring", then return here to verify.

---

## Prompt 6 — Run Scoring Button

```
Add a /scoring page with a "Run Scoring" button.

Behavior:
1. When clicked, the server runs:
   python jobs/run_inference.py
2. The Python script writes predictions into order_predictions keyed by order_id.
3. The UI shows:
   - Success/failure status
   - How many orders were scored (parse stdout if available)
   - Timestamp

Constraints:
- Provide safe execution: timeouts and capture stdout/stderr.
- The app should not crash if Python fails; show an error message instead.
- Do not require Docker.

Deliver:
- Next.js route/handler for triggering scoring
- Implementation details for running Python from Node
- Any UI components needed
```

**Verify:**
- [ ] Clicking "Run Scoring" triggers `jobs/run_inference.py`
- [ ] Success case shows status, order count scored, and timestamp
- [ ] Failure case (e.g., script not found) shows an error message without crashing
- [ ] `/warehouse/priority` reflects the new predictions after scoring

---

## Prompt 7 — Polishing and Testing Checklist

```
Polish the app for student usability and add a testing checklist.

Tasks:
1. Add a banner showing which customer is currently selected.
2. Add basic form validation on /place-order.
3. Add error handling for missing DB, missing tables, or empty results.
4. Provide a manual QA checklist:
   - Select customer
   - Place order
   - View orders
   - Run scoring
   - View priority queue with the new order appearing (after scoring)

Deliver:
- Final code changes
- A README.md with setup and run steps
```

**Verify (full end-to-end):**
- [ ] Select a customer → banner appears everywhere
- [ ] Place an order with multiple line items → appears in `/orders`
- [ ] `/orders/[order_id]` shows correct line items
- [ ] Run Scoring → success message with count
- [ ] `/warehouse/priority` shows the new order ranked by probability
- [ ] All error states (no customer, empty results, Python failure) are handled gracefully
