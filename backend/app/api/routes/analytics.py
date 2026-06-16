from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.database import get_db
from app.db.models import LearningStats, Document, Quiz, QuizAttempt
from app.api.schemas import LearningStatsOut, ProfileStatsOut
from app.core.security import get_current_user
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/stats", response_model=ProfileStatsOut)
async def get_profile_summary_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes global performance statistics for the user profile dashboard.
    """
    user_id = UUID(current_user["id"])
    
    # 1. Total documents count
    doc_count_query = select(func.count(Document.id)).where(Document.uploaded_by == user_id)
    doc_count = (await db.execute(doc_count_query)).scalar() or 0
    
    # 2. Total quizzes count
    quiz_count_query = select(func.count(QuizAttempt.id)).where(QuizAttempt.user_id == user_id)
    quiz_count = (await db.execute(quiz_count_query)).scalar() or 0
    
    # 3. Estimated study hours and accuracy average from LearningStats
    stats_query = select(
        func.sum(LearningStats.hours_studied),
        func.avg(LearningStats.accuracy)
    ).where(LearningStats.user_id == user_id)
    
    stats_result = (await db.execute(stats_query)).first()
    
    hours_studied = float(stats_result[0]) if stats_result and stats_result[0] is not None else 0.0
    accuracy_avg = int(stats_result[1]) if stats_result and stats_result[1] is not None else 0
    
    # Static token metrics mock or calculated from logs
    tokens_consumed = 124500 # Seed representation
    
    return {
        "total_documents": doc_count,
        "total_quizzes": quiz_count,
        "tokens_consumed": tokens_consumed,
        "study_hours_estimated": hours_studied,
        "accuracy_average": accuracy_avg
    }

@router.get("/subject", response_model=List[LearningStatsOut])
async def get_subject_breakdown(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves study hours and quiz accuracy breakdown for each subject.
    """
    user_id = UUID(current_user["id"])
    
    query = select(LearningStats).where(LearningStats.user_id == user_id).order_by(LearningStats.accuracy.desc())
    result = await db.execute(query)
    return result.scalars().all()
