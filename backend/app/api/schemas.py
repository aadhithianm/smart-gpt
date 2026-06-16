from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# Workspace schemas
class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class WorkspaceMemberAdd(BaseModel):
    user_id: UUID
    role: str = Field("member", pattern="^(admin|member)$")

class WorkspaceMemberOut(BaseModel):
    workspace_id: UUID
    user_id: UUID
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Document schemas
class DocumentOut(BaseModel):
    id: UUID
    workspace_id: UUID
    uploaded_by: UUID
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Chat schemas
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"
    search_mode: str = Field("hybrid", pattern="^(materials|web|hybrid)$")

class ChatSessionUpdate(BaseModel):
    title: str = Field(..., min_length=1)

class ChatSessionOut(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    search_mode: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageSourceOut(BaseModel):
    id: UUID
    message_id: UUID
    source_type: str
    source_name: str
    source_url: Optional[str] = None
    chunk_id: Optional[UUID] = None
    page_number: Optional[int] = None
    snippet: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    created_at: datetime
    sources: List[MessageSourceOut] = []

    class Config:
        from_attributes = True

class ChatQueryRequest(BaseModel):
    session_id: UUID
    content: str
    prompt_template_id: Optional[UUID] = None

# Quiz schemas
class QuizCreate(BaseModel):
    subject: str = Field(..., min_length=1)
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    quiz_type: str = Field("mcq", pattern="^(mcq|short_answer|exam_paper)$")
    number_of_questions: int = Field(5, ge=1, le=20)
    document_ids: List[UUID] = []

class QuizQuestionOut(BaseModel):
    id: str
    question: str
    options: List[str]
    correct: str
    explanation: str

class QuizOut(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    subject: str
    difficulty: str
    quiz_type: str
    questions: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    answers: Dict[str, str] # {"question_id": "selected_option"}

class QuizAttemptOut(BaseModel):
    id: UUID
    quiz_id: UUID
    user_id: UUID
    answers: Dict[str, str]
    score: int
    completed_at: datetime

    class Config:
        from_attributes = True

# Flashcard schemas
class FlashcardDeckCreate(BaseModel):
    title: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    document_ids: List[UUID] = []

class FlashcardDeckOut(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    subject: str
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardCreate(BaseModel):
    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)

class FlashcardOut(BaseModel):
    id: UUID
    deck_id: UUID
    front: str
    back: str
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardReviewUpdate(BaseModel):
    flashcard_id: UUID
    remembered: bool # True advances box, False resets to Box 1

class FlashcardReviewOut(BaseModel):
    id: UUID
    flashcard_id: UUID
    user_id: UUID
    box: int
    next_review: datetime
    last_reviewed: Optional[datetime] = None

    class Config:
        from_attributes = True

# Study Plan schemas
class StudyPlanCreate(BaseModel):
    title: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    duration_days: int = Field(7, ge=1, le=90)
    goals: Optional[str] = None
    document_ids: List[UUID] = []

class StudyPlanTaskUpdate(BaseModel):
    task_id: str
    completed: bool

class StudyPlanOut(BaseModel):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    subject: str
    duration_days: int
    tasks: List[Dict[str, Any]]
    progress_pct: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Prompt Template schemas
class PromptTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    system_prompt: str = Field(..., min_length=1)

class PromptTemplateOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    system_prompt: str
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics schemas
class LearningStatsOut(BaseModel):
    subject: str
    hours_studied: float
    questions_asked: int
    quizzes_completed: int
    accuracy: int
    updated_at: datetime

    class Config:
        from_attributes = True

class ProfileStatsOut(BaseModel):
    total_documents: int
    total_quizzes: int
    tokens_consumed: int
    study_hours_estimated: float
    accuracy_average: int
