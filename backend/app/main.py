from fastapi import FastAPI

from app.api.routes.production import router as production_router
from app.api.routes.voice import router as voice_router

app = FastAPI(title="ReadQuest API")
app.include_router(production_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
