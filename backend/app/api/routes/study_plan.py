from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import StudyPlan, WorkspaceMember
from app.api.schemas import StudyPlanCreate, StudyPlanOut, StudyPlanTaskUpdate
from app.core.security import get_current_user
from app.services.plan_service import StudyPlanService
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/study-plan", tags=["Study Plans"])

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

@router.post("/generate", response_model=StudyPlanOut, status_code=status.HTTP_201_CREATED)
async def generate_plan_endpoint(
    payload: StudyPlanCreate,
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Spawns Gemini 2.5 Pro to design a structured day-by-day study syllabus.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    try:
        plan = await StudyPlanService.generate_study_plan(
            title=payload.title,
            subject=payload.subject,
            duration_days=payload.duration_days,
            goals=payload.goals or "",
            document_ids=payload.document_ids,
            workspace_id=workspace_id,
            user_id=user_id,
            db=db
        )
        return plan
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate study plan: {str(e)}"
        )

@router.get("", response_model=List[StudyPlanOut])
async def list_plans(
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all study plans associated with a workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = select(StudyPlan).where(StudyPlan.workspace_id == workspace_id).order_by(StudyPlan.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{plan_id}", response_model=StudyPlanOut)
async def get_plan(
    plan_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full tasks list of a study plan.
    """
    user_id = UUID(current_user["id"])
    query = select(StudyPlan).where(StudyPlan.id == plan_id)
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await verify_workspace_access(plan.workspace_id, user_id, db)
    return plan

@router.put("/{plan_id}/task", response_model=StudyPlanOut)
async def toggle_plan_task(
    plan_id: UUID,
    payload: StudyPlanTaskUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles completion flag of a specific checklist item in the daily tasks, updating overall progress.
    """
    user_id = UUID(current_user["id"])
    query = select(StudyPlan).where(StudyPlan.id == plan_id)
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await verify_workspace_access(plan.workspace_id, user_id, db)
    
    # Update checklist JSON object
    updated_tasks = []
    total_items = 0
    completed_items = 0
    
    # Modifying JSON structure of tasks in place
    for task in plan.tasks:
        checklist = task.get("checklist", [])
        for item in checklist:
            total_items += 1
            if item.get("id") == payload.task_id:
                item["completed"] = payload.completed
            if item.get("completed"):
                completed_items += 1
        updated_tasks.append(task)
        
    # Flag modification for SQLAlchemy JSON track
    plan.tasks = updated_tasks
    
    # Calculate progress percent
    if total_items > 0:
        plan.progress_pct = int((completed_items / total_items) * 100)
    else:
        plan.progress_pct = 0
        
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan
