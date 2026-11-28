from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.adapters.question_repository import DatabaseContentProvider
from app.services.question_bank import Engine

router = APIRouter()

@router.get("/generate-practice")
def get_practice_questions(skill_code: str, db: Session = Depends(get_db)):
    # 1. Initialize the DB provider with the current request session
    provider = DatabaseContentProvider(db)
    
    # 2. Inject the provider directly into the engine
    engine = Engine(provider)
    
    # 3. Generate structured questions using your business rules
    questions = engine.generate_for_skill(skill_code=skill_code, count=5, seed=20261130)
    
    return questions
