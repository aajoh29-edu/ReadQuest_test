import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.routes.auth import router as auth_router
from app.api.routes.demo import router as demo_router
from app.api.routes.health import router as health_router
from app.api.routes.production import router as production_router
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
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @application.exception_handler(IntegrityError)
    async def conflict(request, error):
        return JSONResponse(status_code=409, content={"detail": "record conflicts with existing data"})

    @application.exception_handler(SQLAlchemyError)
    async def database_error(request, error):
        return JSONResponse(status_code=503, content={"detail": "database unavailable"})

    @application.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    application.include_router(auth_router)
    application.include_router(production_router)
    application.include_router(health_router)
    if not is_production:
        application.include_router(demo_router)
    return application


app = create_app()
