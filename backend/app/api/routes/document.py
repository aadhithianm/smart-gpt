from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import Document, WorkspaceMember
from app.api.schemas import DocumentOut
from app.core.security import get_current_user
from app.core.supabase import supabase_client
from app.services.doc_service import DocumentParserService
from typing import List, Dict, Any
from uuid import UUID
import os

router = APIRouter(prefix="/documents", tags=["Documents"])

# Max file size limit: 25MB
MAX_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}

async def verify_workspace_access(workspace_id: UUID, user_id: UUID, db: AsyncSession):
    """
    Validates if user is a member of the requested workspace.
    """
    query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    )
    result = await db.execute(query)
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to workspace"
        )
    return member

async def process_document_bg(document_id: UUID, file_bytes: bytes, mime_type: str, user_id: UUID, workspace_id: UUID, db_session_factory):
    """
    Background worker process to parse, chunk, embed, and store documents.
    """
    # Create a new session for background execution
    async with db_session_factory() as db:
        try:
            # 1. Update status to 'processing'
            doc_query = select(Document).where(Document.id == document_id)
            doc = (await db.execute(doc_query)).scalar_one()
            doc.status = "processing"
            await db.commit()

            # 2. Extract Text Page-by-Page
            extracted_pages = DocumentParserService.extract_text(mime_type, file_bytes)

            # 3. Chunk, generate embeddings, and insert into pgvector (workspace-isolated)
            from app.services.vector_service import VectorService
            await VectorService.process_and_index_document(
                document_id=document_id,
                workspace_id=workspace_id,
                user_id=user_id,
                extracted_pages=extracted_pages,
                db=db
            )
            
            doc.status = "indexed"
            await db.commit()
            print(f"Document {document_id} successfully chunked and embedded in pgvector (pages: {len(extracted_pages)})")
            
        except Exception as e:
            # Catch errors and update document state
            await db.rollback()
            try:
                doc_query = select(Document).where(Document.id == document_id)
                doc = (await db.execute(doc_query)).scalar_one()
                doc.status = "failed"
                await db.commit()
            except Exception:
                pass
            print(f"Error processing document {document_id}: {str(e)}")

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    workspace_id: UUID = Query(...),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads a file to Supabase storage and kicks off text extraction parsing in a background task.
    """
    user_id = UUID(current_user["id"])
    
    # 1. Verify access
    await verify_workspace_access(workspace_id, user_id, db)
    
    # 2. Validate file metadata
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
        
    # Read file content safely in chunks to prevent memory exhaustion (OOM)
    contents = bytearray()
    chunk_size = 64 * 1024
    while chunk := await file.read(chunk_size):
        contents.extend(chunk)
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File exceeds maximum size of 25MB"
            )
    contents = bytes(contents)
        
    # 3. Create document record in database
    document_id = UUID(int=0) # Temp placeholder placeholder
    new_doc = Document(
        workspace_id=workspace_id,
        uploaded_by=user_id,
        file_name=filename,
        file_path="",  # Filled after upload
        file_size=len(contents),
        mime_type=file.content_type or "application/octet-stream",
        status="pending"
    )
    db.add(new_doc)
    await db.flush()  # Gen UUID
    
    document_id = new_doc.id
    
    # 4. Upload file to Supabase storage bucket
    storage_path = f"{workspace_id}/{document_id}_{filename}"
    try:
        # Create bucket if not exists is done via manual dashboard, but we can catch errors
        res = supabase_client.storage.from_("documents").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase Storage Upload failed: {str(e)}"
        )
        
    # Update filepath in database
    new_doc.file_path = storage_path
    await db.commit()
    await db.refresh(new_doc)
    
    # 5. Enqueue background text extraction
    from app.db.database import async_session_local
    background_tasks.add_task(
        process_document_bg,
        document_id=new_doc.id,
        file_bytes=contents,
        mime_type=new_doc.mime_type,
        user_id=user_id,
        workspace_id=workspace_id,
        db_session_factory=async_session_local
    )
    
    return new_doc

@router.get("", response_model=List[DocumentOut])
async def list_documents(
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all documents uploaded to a specific workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = select(Document).where(Document.workspace_id == workspace_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes the document from the database and storage.
    """
    user_id = UUID(current_user["id"])
    
    # Fetch document
    query = select(Document).where(Document.id == document_id)
    doc = (await db.execute(query)).scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    # Verify workspace membership
    await verify_workspace_access(doc.workspace_id, user_id, db)
    
    # Remove from Supabase Storage
    try:
        supabase_client.storage.from_("documents").remove([doc.file_path])
    except Exception as e:
        print(f"Warning: Failed to delete storage file: {str(e)}")
        
    # Remove from DB (cascade deletes document_chunks)
    await db.delete(doc)
    await db.commit()
    return
