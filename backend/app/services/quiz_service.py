from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.db.models import DocumentChunk, Quiz
from typing import List, Dict, Any
from uuid import UUID
import json

class QuizService:
    @staticmethod
    def get_model():
        """
        No-op helper kept for backwards compatibility.
        """
        pass

    @classmethod
    async def generate_quiz(
        cls,
        subject: str,
        difficulty: str,
        quiz_type: str,
        number_of_questions: int,
        document_ids: List[UUID],
        workspace_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Quiz:
        """
        Retrieves context from uploaded files and queries Gemini to produce a structured quiz.
        """
        context_blocks = []
        
        # 1. Pull document chunks if document IDs are specified
        if document_ids:
            query = select(DocumentChunk.content).where(DocumentChunk.document_id.in_(document_ids))
            result = await db.execute(query)
            chunks = result.scalars().all()
            # Cap context to prevent token overflows
            context_blocks = chunks[:20]

        # 2. Formulate Prompt
        prompt = (
            f"Generate a study quiz on the subject '{subject}' with difficulty level '{difficulty}'.\n"
            f"The quiz type must be '{quiz_type}' and contain exactly {number_of_questions} questions.\n"
        )
        
        if context_blocks:
            prompt += "Base the quiz questions strictly on the following text context:\n---\n"
            prompt += "\n".join(context_blocks) + "\n---\n"

        prompt += (
            "You MUST output the response in the following JSON schema format:\n"
            "{\n"
            "  \"questions\": [\n"
            "    {\n"
            "      \"id\": \"string (e.g. q1, q2)\",\n"
            "      \"question\": \"string\",\n"
            "      \"options\": [\"string\", \"string\", \"string\", \"string\"],\n"
            "      \"correct\": \"string (exactly matching one of the options elements)\",\n"
            "      \"explanation\": \"string detailing why this is correct and why other choices are wrong\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
        )

        # 3. Call Gemini
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        try:
            quiz_data = json.loads(response.text)
            questions_list = quiz_data.get("questions", [])
        except Exception as e:
            # Fallback if parsing failed
            raise ValueError(f"Failed to generate structured quiz JSON: {str(e)}")

        # 4. Save Quiz to database
        quiz = Quiz(
            workspace_id=workspace_id,
            user_id=user_id,
            title=f"{subject} ({difficulty.capitalize()} {quiz_type.upper()})",
            subject=subject,
            difficulty=difficulty,
            quiz_type=quiz_type,
            questions=questions_list
        )
        
        db.add(quiz)
        await db.commit()
        await db.refresh(quiz)
        return quiz
