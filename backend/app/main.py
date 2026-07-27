import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config.settings import settings
from app.config.database import Base, engine
import app.models  # Ensures all ORM models are registered
from app.utils.logger import setup_logging
from app.routes import upload, products, analytics, forecasts, alerts, ai, export

# Initialize structured logging
setup_logging()
logger = logging.getLogger(__name__)

from app.config.rate_limit import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting RetailIQ AI v{settings.app_version} [{settings.environment}]")
    logger.info(f"Allowed origins: {settings.allowed_origins_list}")
    # Automatically initialize SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
    yield
    logger.info("RetailIQ AI shutting down.")


app = FastAPI(
    title="RetailIQ AI",
    description=(
        "Intelligent Demand Forecasting & Inventory Analytics Platform. "
        "Upload retail transaction data, get AI-powered demand forecasts, "
        "inventory alerts, and natural-language business insights."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"] if not settings.is_production else ["your-domain.com", "*.your-domain.com", "localhost", "127.0.0.1"]
)


@app.middleware("http")
async def add_request_logging(request: Request, call_next):
    """Log every request with timing."""
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 1)
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} [{duration_ms}ms]"
    )
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ─── Global Exception Handlers ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}: {exc}")
    # Never expose stack traces in production
    detail = str(exc) if not settings.is_production else "An internal error occurred."
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": detail, "status_code": 500},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    # Mask granular details in production if needed, but usually validation errors are safe
    return JSONResponse(
        status_code=422,
        content={"error": "Unprocessable Entity", "detail": exc.errors(), "status_code": 422},
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

API_PREFIX = "/api/v1"

app.include_router(upload.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(forecasts.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(export.router, prefix=API_PREFIX)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe for Docker/orchestrators."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "RetailIQ AI API",
        "docs": "/docs",
        "health": "/health",
        "version": settings.app_version,
    }
