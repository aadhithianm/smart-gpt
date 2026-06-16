from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.db.models import DocumentChunk, Message, MessageSource, ChatSession
from app.services.vector_service import VectorService
from typing import AsyncGenerator, List, Dict, Any
from uuid import UUID
import json

class AIService:
    @staticmethod
    def get_generative_model(model_name: str = "gemini-2.5-flash", enable_grounding: bool = False, system_instruction: str = None):
        """
        No-op helper kept for backwards compatibility.
        """
        pass

    @staticmethod
    async def search_citations(
        query: str, 
        workspace_id: UUID, 
        db: AsyncSession, 
        match_count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generates query embedding and performs similarity matching on workspace documents.
        """
        # 1. Generate Query Vector
        query_vector = await VectorService.generate_embedding(query)
        
        # 2. Invoke match function using raw SQL select (since pgvector Cosine similarity matches are custom functions)
        sql = """
            SELECT id, document_id, content, page_number, similarity 
            FROM match_workspace_document_chunks(:embedding, :threshold, :limit, :ws_id)
        """
        result = await db.execute(
            select(
                DocumentChunk.id,
                DocumentChunk.document_id,
                DocumentChunk.content,
                DocumentChunk.page_number
            ).from_statement(
                # Use execute with parameter binding
                select(DocumentChunk) # placeholder ORM select
            ),
            # We will use raw SQL directly to avoid ORM mappings mismatch on similarity metric column
        )
        
        # Safe raw SQL execute:
        from sqlalchemy import text
        raw_result = await db.execute(
            text(r"""
                SELECT dc.id, dc.document_id, dc.content, dc.page_number, 
                       (1 - (dc.embedding <=> :embedding\:\:vector)) as similarity,
                       d.file_name
                FROM document_chunks dc
                JOIN documents d ON dc.document_id = d.id
                WHERE dc.workspace_id = :ws_id AND d.status = 'indexed'
                  AND (1 - (dc.embedding <=> :embedding\:\:vector)) > :threshold
                ORDER BY dc.embedding <=> :embedding\:\:vector
                LIMIT :limit
            """),
            {
                "embedding": str(query_vector),
                "ws_id": workspace_id,
                "threshold": 0.60,
                "limit": match_count
            }
        )
        
        citations = []
        for row in raw_result:
            citations.append({
                "chunk_id": row[0],
                "document_id": row[1],
                "content": row[2],
                "page_number": row[3],
                "similarity": row[4],
                "file_name": row[5]
            })
        return citations

    @classmethod
    async def generate_chat_stream(
        cls,
        session_id: UUID,
        user_query: str,
        workspace_id: UUID,
        db: AsyncSession
    ) -> AsyncGenerator[str, None]:
        """
        Orchestrates RAG context, calls Gemini model, streams responses via SSE, 
        and updates session logs.
        """
        # 1. Get Chat Session parameters
        session_query = select(ChatSession).where(ChatSession.id == session_id)
        session = (await db.execute(session_query)).scalar_one()
        
        search_mode = session.search_mode
        enable_grounding = search_mode in ["web", "hybrid"]
        use_materials = search_mode in ["materials", "hybrid"]
        
        citations = []
        context_blocks = []
        
        # 2. RAG Context Retrieval
        if use_materials:
            try:
                citations = await cls.search_citations(user_query, workspace_id, db)
                for idx, cite in enumerate(citations):
                    context_blocks.append(
                        f"Source [{idx + 1}] (File: {cite['file_name']}, Page: {cite['page_number']}):\n{cite['content']}\n"
                    )
            except Exception as e:
                print(f"Warning: RAG search citation retrieval failed: {str(e)}")

        # 3. Construct Context Prompt
        system_instruction = (
            "You are StudyGPT, a staff study assistant. "
            "Explain concepts clearly, formatting with clean markdown, equations using LaTeX math signs, and code using code fences. "
        )
        
        if search_mode == "materials":
            system_instruction += (
                "\nBase your answer STRICTLY on the provided documents. "
                "If the answer cannot be found in the documents, explain that you are locked in 'My Materials' mode and cannot find it. "
                "Cite your sources in the text using [Source Name Page X] formatting where appropriate."
            )
        elif search_mode == "hybrid":
            system_instruction += (
                "\nCombine the provided local documents context with live web searches to formulate your answer. "
                "Draw from both where possible. Cite the documents explicitly when referencing them."
            )
        
        # Build prompt payload
        prompt = ""
        if context_blocks:
            prompt += "Here are the relevant study materials context:\n---\n" + "\n".join(context_blocks) + "\n---\n"
            
        prompt += f"User query: {user_query}\n"

        # 4. Save User Message
        user_message = Message(session_id=session_id, role="user", content=user_query)
        db.add(user_message)
        await db.flush()

        # 5. Yield Citations Event
        yield f"event: citations\ndata: {json.dumps(citations)}\n\n"

        # 6. Stream Generation
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        tools = None
        if enable_grounding:
            tools = [types.Tool(google_search=types.GoogleSearch())]
            
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=tools
        )
        
        assistant_reply_text = ""
        try:
            response = await client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            
            async for chunk in response:
                chunk_text = chunk.text or ""
                assistant_reply_text += chunk_text
                # SSE Event stream format
                yield f"event: token\ndata: {json.dumps({'text': chunk_text})}\n\n"
                
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            print(f"Error in Gemini streaming generation: {str(e)}")
            return

        # 7. Save Assistant Message & Citations Log
        assistant_message = Message(session_id=session_id, role="assistant", content=assistant_reply_text)
        db.add(assistant_message)
        await db.flush()

        # Save citations relation log
        for cite in citations:
            source = MessageSource(
                message_id=assistant_message.id,
                source_type="file",
                source_name=cite["file_name"],
                chunk_id=cite["chunk_id"],
                page_number=cite["page_number"],
                snippet=cite["content"][:200]
            )
            db.add(source)

        await db.commit()
        yield "event: done\ndata: {}\n\n"
