"""Initial schema — create all tables

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── uploads ──────────────────────────────────────────────────────
    op.create_table(
        "uploads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_size", sa.Integer()),
        sa.Column("row_count", sa.Integer()),
        sa.Column("valid_rows", sa.Integer()),
        sa.Column("invalid_rows", sa.Integer()),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text()),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_uploads_status", "uploads", ["status"])

    # ── products ─────────────────────────────────────────────────────
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stock_code", sa.String(20), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.String(100)),
        sa.Column("abc_class", sa.String(1)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stock_code", name="uq_products_stock_code"),
    )
    op.create_index("ix_products_stock_code", "products", ["stock_code"])
    op.create_index("ix_products_abc_class", "products", ["abc_class"])
    op.create_index("ix_products_category", "products", ["category"])

    # ── transactions ─────────────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_no", sa.String(20), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("revenue", sa.Numeric(12, 2)),
        sa.Column("invoice_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("customer_id", sa.String(20)),
        sa.Column("country", sa.String(100)),
        sa.Column("is_return", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("upload_id", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["upload_id"], ["uploads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_invoice_no", "transactions", ["invoice_no"])
    op.create_index("ix_transactions_product_id", "transactions", ["product_id"])
    op.create_index("ix_transactions_invoice_date", "transactions", ["invoice_date"])
    op.create_index("ix_transactions_customer_id", "transactions", ["customer_id"])
    op.create_index("ix_transactions_product_date", "transactions", ["product_id", "invoice_date"])

    # ── daily_sales ──────────────────────────────────────────────────
    op.create_table(
        "daily_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("total_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_revenue", sa.Numeric(12, 2), server_default="0"),
        sa.Column("transaction_count", sa.Integer(), server_default="0"),
        sa.Column("avg_unit_price", sa.Numeric(10, 2)),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "sale_date", name="uq_daily_sales_product_date"),
    )
    op.create_index("ix_daily_sales_sale_date", "daily_sales", ["sale_date"])
    op.create_index("ix_daily_sales_product_date", "daily_sales", ["product_id", "sale_date"])

    # ── ml_runs ──────────────────────────────────────────────────────
    op.create_table(
        "ml_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("model_version", sa.String(20), server_default="1.0.0"),
        sa.Column("training_start", sa.DateTime(timezone=True)),
        sa.Column("training_end", sa.DateTime(timezone=True)),
        sa.Column("products_trained", sa.Integer(), server_default="0"),
        sa.Column("mae", sa.Numeric(10, 4)),
        sa.Column("rmse", sa.Numeric(10, 4)),
        sa.Column("mape", sa.Numeric(10, 4)),
        sa.Column("parameters", postgresql.JSONB()),
        sa.Column("artifact_path", sa.Text()),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ml_runs_model_name", "ml_runs", ["model_name"])
    op.create_index("ix_ml_runs_status", "ml_runs", ["status"])

    # ── forecasts ────────────────────────────────────────────────────
    op.create_table(
        "forecasts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("model_run_id", sa.Integer(), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("predicted_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("lower_bound", sa.Numeric(10, 2)),
        sa.Column("upper_bound", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["model_run_id"], ["ml_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_forecasts_product_date", "forecasts", ["product_id", "forecast_date"])
    op.create_index("ix_forecasts_model_run_id", "forecasts", ["model_run_id"])

    # ── inventory_alerts ─────────────────────────────────────────────
    op.create_table(
        "inventory_alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("reorder_qty", sa.Integer()),
        sa.Column("reorder_point", sa.Numeric(10, 2)),
        sa.Column("current_velocity", sa.Numeric(10, 4)),
        sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_product_id", "inventory_alerts", ["product_id"])
    op.create_index("ix_alerts_alert_type", "inventory_alerts", ["alert_type"])
    op.create_index("ix_alerts_severity", "inventory_alerts", ["severity"])
    op.create_index("ix_alerts_is_resolved", "inventory_alerts", ["is_resolved"])
    op.create_index("ix_alerts_product_resolved", "inventory_alerts", ["product_id", "is_resolved"])

    # ── ai_insights ──────────────────────────────────────────────────
    op.create_table(
        "ai_insights",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("insight_type", sa.String(50), nullable=False),
        sa.Column("context_hash", sa.String(64)),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("response", sa.Text(), nullable=False),
        sa.Column("model_used", sa.String(50)),
        sa.Column("tokens_used", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("context_hash", name="uq_ai_insights_hash"),
    )
    op.create_index("ix_ai_insights_context_hash", "ai_insights", ["context_hash"])
    op.create_index("ix_ai_insights_type", "ai_insights", ["insight_type"])


def downgrade() -> None:
    op.drop_table("ai_insights")
    op.drop_table("inventory_alerts")
    op.drop_table("forecasts")
    op.drop_table("ml_runs")
    op.drop_table("daily_sales")
    op.drop_table("transactions")
    op.drop_table("products")
    op.drop_table("uploads")
