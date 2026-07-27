import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
import google.generativeai as genai

from app.repositories.ai_insight_repo import AIInsightRepository
from app.utils.security import compute_context_hash
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


SYSTEM_PROMPT = """You are RetailIQ AI, an intelligent retail analytics assistant.
You help retail managers and analysts understand their inventory performance, 
demand forecasts, and business trends.

Your responses should be:
- Concise and actionable (max 3-4 paragraphs)
- Data-driven (reference specific numbers from the context provided)
- Business-focused (connect insights to decisions)
- Written for a business audience, not a technical one

Always base your answers on the provided context data. If the data doesn't 
contain enough information to answer confidently, say so clearly."""


class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.insight_repo = AIInsightRepository(db)

    def _get_gemini_client(self):
        """Lazy-load Gemini client to avoid import errors if key is missing."""
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured. Add it to your .env file.")
        genai.configure(api_key=settings.gemini_api_key)
        return genai.GenerativeModel(settings.gemini_model)

    def _build_dashboard_context(self) -> dict:
        """Build the JSON context passed to Gemini for Q&A and summaries."""
        from sqlalchemy import text, func
        from app.models.transaction import Transaction
        from app.models.alert import InventoryAlert
        from app.models.product import Product

        db = self.db

        # KPIs
        kpi_row = db.execute(text("""
            SELECT
                SUM(revenue)    AS total_revenue,
                COUNT(*)        AS total_transactions,
                AVG(revenue)    AS avg_order_value
            FROM transactions
            WHERE quantity > 0 AND is_return = FALSE
        """)).first()

        # Active alerts summary
        alert_counts = db.execute(text("""
            SELECT alert_type, severity, COUNT(*) AS cnt
            FROM inventory_alerts
            WHERE is_resolved = FALSE
            GROUP BY alert_type, severity
            ORDER BY cnt DESC
        """)).fetchall()

        # Top 10 products by revenue
        top_products = db.execute(text("""
            SELECT p.stock_code, p.description, p.abc_class,
                   SUM(t.revenue) AS revenue, SUM(t.quantity) AS qty
            FROM transactions t
            JOIN products p ON p.id = t.product_id
            WHERE t.quantity > 0 AND t.is_return = FALSE
            GROUP BY p.stock_code, p.description, p.abc_class
            ORDER BY revenue DESC
            LIMIT 10
        """)).fetchall()

        # ABC summary
        abc_counts = db.execute(text("""
            SELECT abc_class, COUNT(*) as cnt
            FROM products
            WHERE abc_class IS NOT NULL
            GROUP BY abc_class
        """)).fetchall()

        from datetime import timedelta
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        # Recent 7-day trend
        trend = db.execute(text("""
            SELECT CAST(invoice_date AS DATE), SUM(revenue), SUM(quantity)
            FROM transactions
            WHERE quantity > 0 AND is_return = FALSE
              AND invoice_date >= :seven_days_ago
              AND upload_id = (SELECT id FROM uploads WHERE is_active = 1 LIMIT 1)
            GROUP BY CAST(invoice_date AS DATE)
            ORDER BY 1
        """), {"seven_days_ago": seven_days_ago}).fetchall()

        context = {
            "kpis": {
                "total_revenue": round(float(kpi_row[0] or 0), 2),
                "total_transactions": int(kpi_row[1] or 0),
                "avg_order_value": round(float(kpi_row[2] or 0), 2),
            },
            "alerts_summary": [
                {"type": r[0], "severity": r[1], "count": int(r[2])}
                for r in alert_counts
            ],
            "top_10_products": [
                {
                    "stock_code": r[0],
                    "description": (r[1] or "")[:50],
                    "abc_class": r[2],
                    "revenue": round(float(r[3] or 0), 2),
                    "quantity": int(r[4] or 0),
                }
                for r in top_products
            ],
            "abc_distribution": {r[0]: int(r[1]) for r in abc_counts if r[0]},
            "recent_7day_revenue": [
                {"date": str(r[0]), "revenue": round(float(r[1] or 0), 2)}
                for r in trend
            ],
        }
        return context

    def answer_question(self, question: str) -> dict:
        """
        Answer a natural-language question using Gemini with dashboard context.
        Results are cached by context hash.
        """
        context = self._build_dashboard_context()
        cache_key_data = {"question": question, "context": context}
        context_hash = compute_context_hash(cache_key_data)

        # Check cache
        cached = self.insight_repo.get_cached(context_hash)
        if cached:
            logger.info(f"AI Q&A cache hit for question: {question[:50]}")
            return {
                "answer": cached.response,
                "question": question,
                "model_used": cached.model_used,
                "from_cache": True,
                "generated_at": cached.created_at,
                "context_summary": {"cached": True},
            }

        # Build prompt
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"CURRENT RETAIL DATA CONTEXT:\n{json.dumps(context, indent=2, default=str)}\n\n"
            f"USER QUESTION: {question}\n\n"
            f"Provide a concise, actionable answer based on the data above."
        )

        model = self._get_gemini_client()
        response = model.generate_content(prompt)
        answer = response.text
        tokens = getattr(response.usage_metadata, "total_token_count", 0)

        # Cache the result
        self.insight_repo.save(
            insight_type="product_qa",
            context_hash=context_hash,
            prompt=prompt,
            response=answer,
            model_used=settings.gemini_model,
            tokens_used=tokens,
        )

        return {
            "answer": answer,
            "question": question,
            "model_used": settings.gemini_model,
            "from_cache": False,
            "generated_at": datetime.utcnow(),
            "context_summary": {
                "total_revenue": context["kpis"]["total_revenue"],
                "active_alerts": sum(a["count"] for a in context["alerts_summary"]),
                "top_products_included": len(context["top_10_products"]),
            },
        }

    def get_daily_summary(self, date_str: str = None) -> dict:
        """Generate an AI-written daily performance summary."""
        if not date_str:
            date_str = datetime.utcnow().strftime("%Y-%m-%d")

        context = self._build_dashboard_context()
        context_hash = compute_context_hash({"type": "daily_summary", "date": date_str, "context": context})

        cached = self.insight_repo.get_cached(context_hash)
        if cached:
            return {
                "summary": cached.response,
                "model_used": cached.model_used,
                "from_cache": True,
                "generated_at": cached.created_at,
                "date": date_str,
            }

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"DATE: {date_str}\n"
            f"RETAIL DATA CONTEXT:\n{json.dumps(context, indent=2, default=str)}\n\n"
            f"Write a brief executive summary (3-4 sentences) of current inventory and sales performance. "
            f"Highlight 2-3 most important insights or action items. "
            f"Keep it business-focused and concise."
        )

        model = self._get_gemini_client()
        response = model.generate_content(prompt)
        summary = response.text
        tokens = getattr(response.usage_metadata, "total_token_count", 0)

        self.insight_repo.save(
            insight_type="daily_summary",
            context_hash=context_hash,
            prompt=prompt,
            response=summary,
            model_used=settings.gemini_model,
            tokens_used=tokens,
        )

        return {
            "summary": summary,
            "model_used": settings.gemini_model,
            "from_cache": False,
            "generated_at": datetime.utcnow(),
            "date": date_str,
        }

    def explain_forecast(self, product_id: int, forecast_data: dict) -> dict:
        """Generate a plain-English explanation of a product's forecast."""
        from app.models.product import Product
        product = self.db.query(Product).filter(Product.id == product_id).first()

        context = {
            "product": {
                "id": product_id,
                "stock_code": product.stock_code if product else "",
                "description": product.description if product else "",
                "abc_class": product.abc_class if product else "",
            },
            "forecast": forecast_data,
        }
        context_hash = compute_context_hash(context)

        cached = self.insight_repo.get_cached(context_hash)
        if cached:
            return {
                "explanation": cached.response,
                "product_id": product_id,
                "model_used": cached.model_used,
                "generated_at": cached.created_at,
            }

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"FORECAST DATA:\n{json.dumps(context, indent=2, default=str)}\n\n"
            f"Explain this forecast in plain English for a retail manager. Include:\n"
            f"1. What the forecast predicts (trend up/down/stable)\n"
            f"2. What the uncertainty range means\n"
            f"3. What action the manager should take based on this forecast\n"
            f"Keep it to 2-3 sentences per point."
        )

        model = self._get_gemini_client()
        response = model.generate_content(prompt)
        explanation = response.text
        tokens = getattr(response.usage_metadata, "total_token_count", 0)

        self.insight_repo.save(
            insight_type="forecast_explain",
            context_hash=context_hash,
            prompt=prompt,
            response=explanation,
            model_used=settings.gemini_model,
            tokens_used=tokens,
        )

        return {
            "explanation": explanation,
            "product_id": product_id,
            "model_used": settings.gemini_model,
            "generated_at": datetime.utcnow(),
        }
