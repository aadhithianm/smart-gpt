from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import Workspace, WorkspaceMember, User
from app.api.schemas import WorkspaceCreate, WorkspaceOut, WorkspaceMemberAdd, WorkspaceMemberOut
from app.core.security import get_current_user
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new study workspace. The creator is automatically added as an owner.
    """
    user_id = UUID(current_user["id"])
    
    # 1. Create Workspace
    workspace = Workspace(name=payload.name, created_by=user_id)
    db.add(workspace)
    
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.get("", response_model=List[WorkspaceOut])
async def list_workspaces(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all workspaces the current user belongs to.
    """
    user_id = UUID(current_user["id"])
    query = (
        select(Workspace)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == user_id)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{workspace_id}/members", response_model=WorkspaceMemberOut)
async def add_workspace_member(
    workspace_id: UUID,
    payload: WorkspaceMemberAdd,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a new student/user to the workspace. Requires workspace admin or owner permissions.
    """
    actor_id = UUID(current_user["id"])
    
    # 1. Check if actor is workspace admin/owner
    actor_query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == actor_id
    )
    actor_member = (await db.execute(actor_query)).scalar_one_or_none()
    if not actor_member or actor_member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can add members"
        )
        
    # 2. Check if user to add exists
    user_exists = (await db.execute(select(User).where(User.id == payload.user_id))).scalar_one_or_none()
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # 3. Check if member already exists
    existing_member = (await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == payload.user_id
        )
    )).scalar_one_or_none()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace"
        )
        
    # 4. Insert Member
    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=payload.user_id,
        role=payload.role
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return new_member

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
async def list_workspace_members(
    workspace_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all members of a specific workspace.
    """
    user_id = UUID(current_user["id"])
    
    # Verify current user is a member of the workspace
    membership = (await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
    )).scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    members = (await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    )).scalars().all()
    return members
