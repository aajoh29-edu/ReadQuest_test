from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes.auth import router as auth_router
from app.api.routes.curriculum import router as curriculum_router
from app.api.routes.demo import router as demo_router
from app.api.routes.learning import router as learning_router
from app.api.routes.portals import router as portals_router
from app.api.routes.production import router as production_router
from app.api.routes.voice import router as voice_router

app = FastAPI(title="ReadQuest API")
app.include_router(demo_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(curriculum_router, prefix="/api/v1")
app.include_router(learning_router, prefix="/api/v1")
app.include_router(portals_router, prefix="/api/v1")
app.include_router(production_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    codes = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        502: "SERVICE_UNAVAILABLE",
        503: "SERVICE_UNAVAILABLE",
        504: "SERVICE_UNAVAILABLE",
    }
    payload = {"code": codes.get(exc.status_code, "SERVER_ERROR"), "message": str(exc.detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content=payload,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    field_errors = {}
    for error in exc.errors():
        location = [part for part in error["loc"] if part != "body"]
        field_errors[".".join(str(part) for part in location) or "body"] = error["msg"]
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Please correct the highlighted fields.",
            "fieldErrors": field_errors,
        },
    )
