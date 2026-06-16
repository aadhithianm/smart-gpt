from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import ChatSession, Message, WorkspaceMember
from app.api.schemas import ChatSessionCreate, ChatSessionOut, ChatSessionUpdate, MessageOut, ChatQueryRequest
from app.core.security import get_current_user
from app.services.ai_service import AIService
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/chat", tags=["Chat"])

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

@router.post("/session", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: ChatSessionCreate,
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new chat session inside a workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    session = ChatSession(
        workspace_id=workspace_id,
        user_id=user_id,
        title=payload.title or "New Chat",
        search_mode=payload.search_mode
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/session", response_model=List[ChatSessionOut])
async def list_chat_sessions(
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all chat sessions belonging to a specific workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = (
        select(ChatSession)
        .where(ChatSession.workspace_id == workspace_id)
        .order_by(ChatSession.updated_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/session/{session_id}")
async def get_chat_session_details(
    session_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full message logs and citations list for a chat session.
    """
    user_id = UUID(current_user["id"])
    
    # Fetch session
    session_query = select(ChatSession).where(ChatSession.id == session_id)
    session = (await db.execute(session_query)).scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
        
    await verify_workspace_access(session.workspace_id, user_id, db)
    
    # Fetch messages joined with sources
    msg_query = (
        select(Message)
        .where(Message.session_id == session_id)
        .options(selectinload(Message.sources))
        .order_by(Message.created_at.ascii() if hasattr(Message.created_at, "ascii") else Message.created_at.asc())
    )
    messages = (await db.execute(msg_query)).scalars().all()
    
    return {
        "id": session.id,
        "title": session.title,
        "search_mode": session.search_mode,
        "messages": messages
    }

@router.put("/session/{session_id}", response_model=ChatSessionOut)
async def rename_chat_session(
    session_id: UUID,
    payload: ChatSessionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Renames the chat session title.
    """
    user_id = UUID(current_user["id"])
    query = select(ChatSession).where(ChatSession.id == session_id)
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await verify_workspace_access(session.workspace_id, user_id, db)
    
    session.title = payload.title
    await db.commit()
    await db.refresh(session)
    return session

@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes the chat session.
    """
    user_id = UUID(current_user["id"])
    query = select(ChatSession).where(ChatSession.id == session_id)
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await verify_workspace_access(session.workspace_id, user_id, db)
    
    await db.delete(session)
    await db.commit()
    return

@router.post("/query")
async def chat_query_endpoint(
    payload: ChatQueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a query to the chat and returns a Server-Sent Events (SSE) stream of the AI typing.
    """
    user_id = UUID(current_user["id"])
    
    # 1. Fetch Session and Verify Access
    query = select(ChatSession).where(ChatSession.id == payload.session_id)
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await verify_workspace_access(session.workspace_id, user_id, db)
    
    # 2. Return SSE Stream Response
    return StreamingResponse(
        AIService.generate_chat_stream(
            session_id=payload.session_id,
            user_query=payload.content,
            workspace_id=session.workspace_id,
            db=db
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
