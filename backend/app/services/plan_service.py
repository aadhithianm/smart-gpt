from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.db.models import DocumentChunk, StudyPlan
from typing import List, Dict, Any
from uuid import UUID
import json

class StudyPlanService:
    @staticmethod
    def get_pro_model():
        """
        No-op helper kept for backwards compatibility.
        """
        pass

    @classmethod
    async def generate_study_plan(
        cls,
        title: str,
        subject: str,
        duration_days: int,
        goals: str,
        document_ids: List[UUID],
        workspace_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> StudyPlan:
        """
        Queries Gemini 2.5 Pro to design an adaptive study schedule.
        """
        context_blocks = []
        if document_ids:
            from app.db.models import Document
            query = (
                select(DocumentChunk.content)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(
                    DocumentChunk.document_id.in_(document_ids),
                    Document.workspace_id == workspace_id
                )
                .order_by(DocumentChunk.document_id, DocumentChunk.chunk_index)
            )
            result = await db.execute(query)
            chunks = result.scalars().all()
            
            # Uniformly sample chunks to get a representative summary of the documents
            cap = 15
            if len(chunks) > cap:
                step = len(chunks) / cap
                context_blocks = [chunks[int(i * step)] for i in range(cap)]
            else:
                context_blocks = list(chunks)

        # 2. Formulate prompt instructing Pro to design calendar
        prompt = (
            f"Act as a professional university counselor. Create a structured {duration_days}-day study plan.\n"
            f"Plan Name: '{title}'\n"
            f"Subject: '{subject}'\n"
            f"Student Goals: '{goals or 'Master this subject step-by-step'}'\n"
        )
        
        if context_blocks:
            prompt += "Base the schedule, syllabus pacing, and tasks on this material:\n---\n"
            prompt += "\n".join(context_blocks) + "\n---\n"

        prompt += (
            "You MUST output the study plan exactly matching this JSON structure:\n"
            "{\n"
            "  \"tasks\": [\n"
            "    {\n"
            "      \"id\": \"string (unique task ID like task_d1_1, task_d1_2)\",\n"
            "      \"day\": 1 (integer representing study day),\n"
            "      \"title\": \"string (e.g. Master CPU Cycles)\",\n"
            "      \"description\": \"string (objectives details)\",\n"
            "      \"checklist\": [\n"
            "        {\n"
            "          \"id\": \"string (unique checklist item ID)\",\n"
            "          \"text\": \"string (discrete review task checklist item)\",\n"
            "          \"completed\": false\n"
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n"
        )

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        try:
            response = await client.aio.models.generate_content(
                model="gemini-2.5-pro",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
        except Exception as e:
            # Fallback to flash if pro is not available or quota exceeded
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
        
        try:
            plan_data = json.loads(response.text)
            tasks_list = plan_data.get("tasks", [])
        except Exception as e:
            raise ValueError(f"Failed to generate structured study plan JSON: {str(e)}")

        # Create model entry
        plan = StudyPlan(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            subject=subject,
            duration_days=duration_days,
            tasks=tasks_list,
            progress_pct=0
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return plan
