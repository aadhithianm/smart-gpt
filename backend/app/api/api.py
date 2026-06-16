from fastapi import APIRouter
from app.api.routes import workspace, document, chat, quiz, study_plan, flashcard, analytics

api_router = APIRouter()
api_router.include_router(workspace.router)
api_router.include_router(document.router)
api_router.include_router(chat.router)
api_router.include_router(quiz.router)
api_router.include_router(study_plan.router)
api_router.include_router(flashcard.router)
api_router.include_router(analytics.router)
