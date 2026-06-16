from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import Quiz, QuizAttempt, WorkspaceMember
from app.api.schemas import QuizCreate, QuizOut, QuizAttemptCreate, QuizAttemptOut
from app.core.security import get_current_user
from app.services.quiz_service import QuizService
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/quiz", tags=["Quizzes"])

async def verify_workspace_access(workspace_id: UUID, user_id: UUID, db: AsyncSession):
    query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    )
    member = (await db.execute(query)).scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to workspace"
        )
    return member

@router.post("/generate", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def generate_quiz_endpoint(
    payload: QuizCreate,
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers Gemini model to generate a custom quiz and records it.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    try:
        quiz = await QuizService.generate_quiz(
            subject=payload.subject,
            difficulty=payload.difficulty,
            quiz_type=payload.quiz_type,
            number_of_questions=payload.number_of_questions,
            document_ids=payload.document_ids,
            workspace_id=workspace_id,
            user_id=user_id,
            db=db
        )
        return quiz
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}"
        )

@router.get("", response_model=List[QuizOut])
async def list_quizzes(
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all generated quizzes in the workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = select(Quiz).where(Quiz.workspace_id == workspace_id).order_by(Quiz.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{quiz_id}", response_model=QuizOut)
async def get_quiz(
    quiz_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves detailed questions of a quiz.
    """
    user_id = UUID(current_user["id"])
    query = select(Quiz).where(Quiz.id == quiz_id)
    quiz = (await db.execute(query)).scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    await verify_workspace_access(quiz.workspace_id, user_id, db)
    return quiz

@router.post("/{quiz_id}/attempt", response_model=QuizAttemptOut)
async def submit_quiz_attempt(
    quiz_id: UUID,
    payload: QuizAttemptCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validates answers, logs a quiz attempt, and returns score percentage.
    """
    user_id = UUID(current_user["id"])
    
    # 1. Fetch Quiz
    query = select(Quiz).where(Quiz.id == quiz_id)
    quiz = (await db.execute(query)).scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    await verify_workspace_access(quiz.workspace_id, user_id, db)
    
    # 2. Grade Quiz
    correct_count = 0
    total_questions = len(quiz.questions)
    
    if total_questions == 0:
        raise HTTPException(status_code=400, detail="Quiz contains no questions")
        
    for q in quiz.questions:
        q_id = q.get("id")
        correct_answer = q.get("correct")
        user_answer = payload.answers.get(q_id)
        if user_answer == correct_answer:
            correct_count += 1
            
    score_pct = int((correct_count / total_questions) * 100)
    
    # 3. Save Attempt
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user_id,
        answers=payload.answers,
        score=score_pct
    )
    db.add(attempt)
    
    # 4. Update Learning Stats
    # Insert or update learning stats for user
    from app.db.models import LearningStats
    from sqlalchemy.dialects.postgresql import insert
    
    stmt = insert(LearningStats).values(
        user_id=user_id,
        subject=quiz.subject,
        quizzes_completed=1,
        accuracy=score_pct
    ).on_conflict_do_update(
        constraint="uq_user_subject",
        set_={
            "quizzes_completed": LearningStats.quizzes_completed + 1,
            # Running average of accuracy
            "accuracy": ((LearningStats.accuracy * LearningStats.quizzes_completed) + score_pct) / (LearningStats.quizzes_completed + 1),
            "updated_at": select(func.now()).scalar_subquery() if hasattr(select, "scalar_subquery") else None
        }
    )
    # Since postgres triggers or updates are cleaner, we execute ORM values update or handle it directly
    try:
        async with db.begin_nested():
            stats_query = select(LearningStats).where(
                LearningStats.user_id == user_id,
                LearningStats.subject == quiz.subject
            )
            stats = (await db.execute(stats_query)).scalar_one_or_none()
            if stats:
                stats.quizzes_completed += 1
                stats.accuracy = int(((stats.accuracy * (stats.quizzes_completed - 1)) + score_pct) / stats.quizzes_completed)
            else:
                new_stats = LearningStats(
                    user_id=user_id,
                    subject=quiz.subject,
                    quizzes_completed=1,
                    accuracy=score_pct
                )
                db.add(new_stats)
    except Exception as e:
        print(f"Warning: Failed to update learning stats: {str(e)}")

    await db.commit()
    await db.refresh(attempt)
    return attempt
