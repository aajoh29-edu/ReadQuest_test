from fastapi import FastAPI

from app.api.routes.production import router as production_router

app = FastAPI(title="ReadQuest API")
app.include_router(production_router, prefix="/api/v1")
