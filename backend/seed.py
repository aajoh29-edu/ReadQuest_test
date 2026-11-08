import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select

from database import AsyncSessionLocal
from models import AdultAccount, AdultRole, ChildReader

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Generate the exact deterministic UUIDs used in main.py
        teacher_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, "teacher_demo")
        child_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, "child_demo")
        
        # 1. Seed Teacher/Guardian Account
        result = await session.execute(select(AdultAccount).where(AdultAccount.id == teacher_uuid))
        teacher = result.scalar_one_or_none()
        
        if not teacher:
            teacher = AdultAccount(
                id=teacher_uuid,
                email="teacher_demo@readquest.app",
                password_hash="demo_bypass",  # login endpoint handles auth natively
                full_name="Demo Teacher",
                role=AdultRole.TEACHER,
                consent_verified_at=datetime.now(timezone.utc)
            )
            session.add(teacher)
            await session.flush()
            
        # 2. Seed Child Reader Profile
        result = await session.execute(select(ChildReader).where(ChildReader.id == child_uuid))
        child = result.scalar_one_or_none()
        
        if not child:
            child = ChildReader(
                id=child_uuid,
                guardian_id=teacher.id,
                anonymous_username="child_demo",
                avatar_id="demo_hero"
            )
            session.add(child)
            
        # Commit the transaction
        await session.commit()
        print("Success: Demo accounts seeded into PostgreSQL.")

if __name__ == "__main__":
    asyncio.run(seed_data())