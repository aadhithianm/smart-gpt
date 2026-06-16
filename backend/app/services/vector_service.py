from google import genai
from google.genai import types
from app.core.config import settings
from app.db.models import DocumentChunk
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from uuid import UUID

class VectorService:
    @staticmethod
    def configure_ai():
        """
        No-op config helper kept for backwards compatibility.
        """
        pass

    @classmethod
    def chunk_document_pages(cls, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Splits extracted pages into text chunks of 1000 characters with 200 characters overlap.
        Preserves page mapping.
        """
        chunks = []
        global_chunk_idx = 0

        for page in pages:
            text = page["text"]
            page_num = page["page_number"]
            
            if not text:
                continue

            # Slide over text
            start = 0
            limit = len(text)
            chunk_size = 1000
            overlap = 200
            step = chunk_size - overlap

            while start < limit:
                end = min(start + chunk_size, limit)
                chunk_content = text[start:end]
                
                # Only keep meaningful chunks
                if len(chunk_content.strip()) > 10:
                    chunks.append({
                        "chunk_index": global_chunk_idx,
                        "page_number": page_num,
                        "content": chunk_content.strip()
                    })
                    global_chunk_idx += 1
                
                if end >= limit:
                    break
                start += step

        return chunks

    @classmethod
    async def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates a 768-dimensional vector embedding for the input text using gemini-embedding-001.
        """
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768
            )
        )
        return result.embeddings[0].values

    @classmethod
    async def process_and_index_document(
        cls, 
        document_id: UUID, 
        workspace_id: UUID, 
        user_id: UUID, 
        extracted_pages: List[Dict[str, Any]], 
        db: AsyncSession
    ):
        """
        Chunks pages, generates embeddings, and inserts them into the pgvector document_chunks table.
        """
        # 1. Chunk text
        chunks = cls.chunk_document_pages(extracted_pages)
        if not chunks:
            return

        # 2. Generate embeddings in batches (or sequentially, keeping Gemini rate limits in mind)
        # Call embeddings on all chunks
        for chunk in chunks:
            try:
                embedding = await cls.generate_embedding(chunk["content"])
                
                # 3. Save chunk to database
                db_chunk = DocumentChunk(
                    document_id=document_id,
                    workspace_id=workspace_id,
                    user_id=user_id,
                    chunk_index=chunk["chunk_index"],
                    page_number=chunk["page_number"],
                    content=chunk["content"],
                    embedding=embedding,
                    meta_data={"char_length": len(chunk["content"])}
                )
                db.add(db_chunk)
            except Exception as e:
                print(f"Error generating embedding for chunk {chunk['chunk_index']}: {str(e)}")
                raise e
        
        await db.commit()
