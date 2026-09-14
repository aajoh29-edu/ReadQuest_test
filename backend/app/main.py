import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.demo import router as demo_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    """Application factory used by production and tests."""
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    # In production, hide every interactive/introspection surface (Swagger UI,
    # ReDoc, and the raw OpenAPI schema), not only "/docs". Leaving the schema
    # reachable would still disclose every route, field, and shape to anyone.
    is_production = settings.environment == "production"
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
    )
    if not is_production:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ],
            allow_credentials=False,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["*"],
        )
    application.include_router(health_router)
    application.include_router(demo_router)
    return application


app = create_app()
