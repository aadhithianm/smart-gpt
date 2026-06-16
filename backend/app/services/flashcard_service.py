from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.db.models import DocumentChunk, FlashcardDeck, Flashcard, FlashcardReview
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
import json

class FlashcardService:
    @staticmethod
    def get_model():
        """
        No-op helper kept for backwards compatibility.
        """
        pass

    @classmethod
    async def generate_deck(
        cls,
        title: str,
        subject: str,
        document_ids: List[UUID],
        workspace_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> FlashcardDeck:
        """
        Extracts study material text chunks and generates an active recall flashcard deck.
        """
        context_blocks = []
        if document_ids:
            query = select(DocumentChunk.content).where(DocumentChunk.document_id.in_(document_ids))
            result = await db.execute(query)
            chunks = result.scalars().all()
            context_blocks = chunks[:15]

        # 1. Prompt Gemini for Q&A pairs
        prompt = (
            f"Generate a study flashcard deck titled '{title}' on the subject '{subject}'.\n"
            f"Generate between 5 and 10 highly core conceptual flashcards.\n"
        )
        if context_blocks:
            prompt += "Create questions based on this textbook content:\n---\n"
            prompt += "\n".join(context_blocks) + "\n---\n"

        prompt += (
            "You MUST output the flashcards exactly in this JSON format:\n"
            "{\n"
            "  \"cards\": [\n"
            "    {\n"
            "      \"front\": \"string (clear question or prompt for active recall)\",\n"
            "      \"back\": \"string (concise conceptual explanation or answer)\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
        )

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        try:
            deck_data = json.loads(response.text)
            cards_list = deck_data.get("cards", [])
        except Exception as e:
            raise ValueError(f"Failed to generate structured flashcard deck JSON: {str(e)}")

        # 2. Save Deck
        deck = FlashcardDeck(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            subject=subject
        )
        db.add(deck)
        await db.flush()

        # 3. Save individual Cards & seed initial Spaced Repetition logs (Leitner Box 1)
        for c in cards_list:
            card = Flashcard(
                deck_id=deck.id,
                front=c["front"],
                back=c["back"]
            )
            db.add(card)
            await db.flush()

            # Seed SRS review entry (due immediately)
            review = FlashcardReview(
                flashcard_id=card.id,
                user_id=user_id,
                box=1,
                next_review=datetime.utcnow()
            )
            db.add(review)

        await db.commit()
        await db.refresh(deck)
        return deck

    @staticmethod
    def calculate_next_review(box: int) -> datetime:
        """
        Leitner Spaced Repetition intervals based on Box level.
        - Box 1: Review in 1 day
        - Box 2: Review in 3 days
        - Box 3: Review in 7 days
        - Box 4: Review in 14 days
        - Box 5: Review in 30 days (fully mastered)
        """
        now = datetime.utcnow()
        if box == 1:
            return now + timedelta(days=1)
        elif box == 2:
            return now + timedelta(days=3)
        elif box == 3:
            return now + timedelta(days=7)
        elif box == 4:
            return now + timedelta(days=14)
        else:
            return now + timedelta(days=30)
