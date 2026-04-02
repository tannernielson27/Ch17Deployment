"""
run_inference.py — Fraud Detection Inference Job

Loads fraud_model.pkl, scores unscored orders, writes predictions to order_predictions.

Local dev (SQLite):   python jobs/run_inference.py
Production (Supabase): DATABASE_URL=postgresql://... python jobs/run_inference.py

Run the notebooks/fraud_prediction.ipynb first to train and save the model.
"""

import os
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

BASE_DIR   = Path(__file__).parent.parent
MODEL_PATH = Path(__file__).parent / "fraud_model.pkl"

DATABASE_URL = os.environ.get("DATABASE_URL")
DB_PATH      = BASE_DIR / "shop.db"

NUMERIC_FEATURES = [
    "order_subtotal", "shipping_fee", "order_total", "risk_score",
    "item_count", "unique_products", "max_unit_price", "avg_unit_price",
    "billing_shipping_match", "domestic_ip", "promo_used",
    "account_age_days", "order_hour", "is_weekend",
]
CATEGORICAL_FEATURES = [
    "payment_method", "device_type", "customer_segment", "loyalty_tier",
]


def get_connection():
    if DATABASE_URL:
        import psycopg2
        print(f"Connecting to Supabase (PostgreSQL)...")
        return psycopg2.connect(DATABASE_URL), "postgres"
    else:
        import sqlite3
        print(f"Connecting to local SQLite: {DB_PATH}")
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"


def ensure_predictions_table(conn, db_type):
    ddl = """
        CREATE TABLE IF NOT EXISTS order_predictions (
            order_id                  INTEGER PRIMARY KEY,
            late_delivery_probability REAL,
            predicted_late_delivery   INTEGER,
            prediction_timestamp      TEXT
        )
    """
    cur = conn.cursor()
    cur.execute(ddl)
    conn.commit()


def build_features(conn):
    orders = pd.read_sql("SELECT * FROM orders", conn)
    customers = pd.read_sql(
        "SELECT customer_id, customer_segment, loyalty_tier, is_active, created_at FROM customers",
        conn,
    )
    items_agg = pd.read_sql("""
        SELECT order_id,
               COUNT(*) AS item_count,
               COUNT(DISTINCT product_id) AS unique_products,
               SUM(line_total) AS items_total,
               MAX(unit_price) AS max_unit_price,
               AVG(unit_price) AS avg_unit_price
        FROM order_items GROUP BY order_id
    """, conn)

    df = (
        orders
        .merge(customers, on="customer_id", how="left")
        .merge(items_agg, on="order_id", how="left")
    )

    df["billing_shipping_match"] = (df["billing_zip"] == df["shipping_zip"]).astype(int)
    df["domestic_ip"]            = (df["ip_country"] == "US").astype(int)
    df["promo_used"]             = df["promo_used"].fillna(0).astype(int)
    df["order_dt"]               = pd.to_datetime(df["order_datetime"])
    df["created_dt"]             = pd.to_datetime(df["created_at"])
    df["account_age_days"]       = (df["order_dt"] - df["created_dt"]).dt.days.clip(lower=0)
    df["order_hour"]             = df["order_dt"].dt.hour
    df["is_weekend"]             = df["order_dt"].dt.dayofweek.isin([5, 6]).astype(int)

    for col in ["item_count", "unique_products", "items_total", "max_unit_price", "avg_unit_price"]:
        df[col] = df[col].fillna(0)
    df["account_age_days"] = df["account_age_days"].fillna(df["account_age_days"].median())

    return df


def main():
    if not MODEL_PATH.exists():
        print(f"ERROR: Model not found at {MODEL_PATH}", file=sys.stderr)
        print("Run notebooks/fraud_prediction.ipynb first to train and save the model.")
        sys.exit(1)

    conn, db_type = get_connection()
    ensure_predictions_table(conn, db_type)

    already_scored = set(
        row[0] for row in conn.cursor().execute("SELECT order_id FROM order_predictions").fetchall()
    )

    df = build_features(conn)
    to_score = df[~df["order_id"].isin(already_scored)].copy()

    if to_score.empty:
        print("No new orders to score.")
        conn.close()
        return

    model = joblib.load(MODEL_PATH)
    X     = to_score[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    probs = model.predict_proba(X)[:, 1]
    preds = model.predict(X)

    timestamp = datetime.now().isoformat(timespec="seconds")

    if db_type == "postgres":
        cur = conn.cursor()
        for oid, prob, pred in zip(to_score["order_id"].tolist(), probs.tolist(), preds.tolist()):
            cur.execute("""
                INSERT INTO order_predictions
                    (order_id, late_delivery_probability, predicted_late_delivery, prediction_timestamp)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (order_id) DO UPDATE SET
                    late_delivery_probability = EXCLUDED.late_delivery_probability,
                    predicted_late_delivery   = EXCLUDED.predicted_late_delivery,
                    prediction_timestamp      = EXCLUDED.prediction_timestamp
            """, (int(oid), float(prob), int(pred), timestamp))
    else:
        rows = list(zip(
            to_score["order_id"].tolist(),
            probs.tolist(), preds.tolist(),
            [timestamp] * len(to_score),
        ))
        conn.cursor().executemany("""
            INSERT INTO order_predictions
                (order_id, late_delivery_probability, predicted_late_delivery, prediction_timestamp)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(order_id) DO UPDATE SET
                late_delivery_probability = excluded.late_delivery_probability,
                predicted_late_delivery   = excluded.predicted_late_delivery,
                prediction_timestamp      = excluded.prediction_timestamp
        """, rows)

    conn.commit()
    conn.close()

    print(f"Scored: {len(to_score)} orders")
    print(f"Timestamp: {timestamp}")


if __name__ == "__main__":
    main()
