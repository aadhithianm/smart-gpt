from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import FlashcardDeck, Flashcard, FlashcardReview, WorkspaceMember
from app.api.schemas import FlashcardDeckCreate, FlashcardDeckOut, FlashcardReviewUpdate, FlashcardReviewOut
from app.core.security import get_current_user
from app.services.flashcard_service import FlashcardService
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

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

@router.post("/deck", response_model=FlashcardDeckOut, status_code=status.HTTP_201_CREATED)
async def generate_deck_endpoint(
    payload: FlashcardDeckCreate,
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates an active recall flashcard deck using the Gemini model.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    try:
        deck = await FlashcardService.generate_deck(
            title=payload.title,
            subject=payload.subject,
            document_ids=payload.document_ids,
            workspace_id=workspace_id,
            user_id=user_id,
            db=db
        )
        return deck
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate deck: {str(e)}"
        )

@router.get("/deck", response_model=List[FlashcardDeckOut])
async def list_decks(
    workspace_id: UUID = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all flashcard decks inside a workspace.
    """
    user_id = UUID(current_user["id"])
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = select(FlashcardDeck).where(FlashcardDeck.workspace_id == workspace_id).order_by(FlashcardDeck.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/deck/{deck_id}/review")
async def get_due_review_cards(
    deck_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves all cards in a deck that are currently due for spaced repetition review.
    """
    user_id = UUID(current_user["id"])
    
    # Verify workspace access
    deck_query = select(FlashcardDeck).where(FlashcardDeck.id == deck_id)
    deck = (await db.execute(deck_query)).scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")
        
    await verify_workspace_access(deck.workspace_id, user_id, db)
    
    # Query due review cards (next_review <= now)
    now = datetime.utcnow()
    query = (
        select(Flashcard, FlashcardReview)
        .join(FlashcardReview, Flashcard.id == FlashcardReview.flashcard_id)
        .where(
            Flashcard.deck_id == deck_id,
            FlashcardReview.user_id == user_id,
            FlashcardReview.next_review <= now
        )
    )
    result = await db.execute(query)
    
    cards_list = []
    for card, review in result:
        cards_list.append({
            "id": card.id,
            "front": card.front,
            "back": card.back,
            "box": review.box,
            "next_review": review.next_review
        })
        
    return cards_list

@router.post("/review", response_model=FlashcardReviewOut)
async def submit_card_review(
    payload: FlashcardReviewUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves Leitner Spaced Repetition review logs.
    If remembered=True, advances the card box by 1 (max 5), pushing next_review farther.
    If false, resets to box 1.
    """
    user_id = UUID(current_user["id"])
    
    # Find active review log
    query = select(FlashcardReview).where(
        FlashcardReview.flashcard_id == payload.flashcard_id,
        FlashcardReview.user_id == user_id
    )
    review = (await db.execute(query)).scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Flashcard review log not found")
        
    # Apply Leitner Box scheduling logic
    if payload.remembered:
        new_box = min(review.box + 1, 5)
    else:
        new_box = 1
        
    review.box = new_box
    review.next_review = FlashcardService.calculate_next_review(new_box)
    review.last_reviewed = datetime.utcnow()
    
    # Update global user learning statistics hours studied
    try:
        async with db.begin_nested():
            from app.db.models import LearningStats, Flashcard
            # Fetch subject from deck
            card_query = select(Flashcard).where(Flashcard.id == payload.flashcard_id)
            card = (await db.execute(card_query)).scalar_one()
            
            deck_query = select(FlashcardDeck).where(FlashcardDeck.id == card.deck_id)
            deck = (await db.execute(deck_query)).scalar_one()
            
            stats_query = select(LearningStats).where(
                LearningStats.user_id == user_id,
                LearningStats.subject == deck.subject
            )
            stats = (await db.execute(stats_query)).scalar_one_or_none()
            if stats:
                # Add estimated active review study hours
                stats.hours_studied = float(stats.hours_studied) + 0.05 # 3 minutes per review estimate
            else:
                new_stats = LearningStats(
                    user_id=user_id,
                    subject=deck.subject,
                    hours_studied=0.05
                )
                db.add(new_stats)
    except Exception as e:
        print(f"Warning: Failed to update reviews study stats: {str(e)}")

    await db.commit()
    await db.refresh(review)
    return review
