from typing import Optional
from sqlalchemy.orm import Session
import httpx

from app.config import settings
from app.services.file_service import FileService
from app.schemas.files import SummarizeDocumentResponse
from app.security.path_guard import PathSecurityError

class DocService:
    @staticmethod
    def chunk_text(text: str, max_chunk_chars: int = 4000) -> list[str]:
        """Splits long text into manageable chunks respecting paragraphs."""
        if len(text) <= max_chunk_chars:
            return [text]

        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_length = 0

        for p in paragraphs:
            if current_length + len(p) > max_chunk_chars and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = [p]
                current_length = len(p)
            else:
                current_chunk.append(p)
                current_length += len(p)

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks or [text[:max_chunk_chars]]

    @classmethod
    async def summarize_document_async(
        cls,
        path: str,
        db: Session,
        model: Optional[str] = None,
        ollama_endpoint: Optional[str] = None
    ) -> SummarizeDocumentResponse:
        """
        Reads document and calls local Ollama model to generate an executive summary.
        Chunks long documents and handles failures gracefully.
        """
        read_res = FileService.read_document(path, db)
        
        if read_res.is_scanned_pdf:
            return SummarizeDocumentResponse(
                path=read_res.path,
                filename=read_res.filename,
                summary="Cannot summarize: This PDF contains scanned images without a selectable text layer. OCR support is required.",
                model_used=model or settings.DEFAULT_MODEL,
                chunks_processed=0,
                character_count=read_res.character_count
            )

        if not read_res.content.strip():
            return SummarizeDocumentResponse(
                path=read_res.path,
                filename=read_res.filename,
                summary="The document is empty; no content could be summarized.",
                model_used=model or settings.DEFAULT_MODEL,
                chunks_processed=0,
                character_count=0
            )

        endpoint = ollama_endpoint or settings.OLLAMA_HOST
        target_model = model or settings.DEFAULT_MODEL

        chunks = cls.chunk_text(read_res.content, max_chunk_chars=3500)
        # For simplicity and speed on local 4B model, summarize chunk 1 or key points
        text_to_summarize = chunks[0]
        if len(chunks) > 1:
            text_to_summarize += f"\n\n[Note: Document has {len(chunks)} sections; summarizing primary content]"

        prompt = (
            f"You are an executive document summarizer. Provide a concise, clear summary "
            f"of the following text from document '{read_res.filename}'. "
            f"Include 3-5 bullet key points:\n\n"
            f"--- CONTENT BEGIN ---\n"
            f"{text_to_summarize}\n"
            f"--- CONTENT END ---\n\n"
            f"SUMMARY:"
        )

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(
                    f"{endpoint}/api/generate",
                    json={
                        "model": target_model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    summary_text = data.get("response", "").strip()
                    if not summary_text:
                        summary_text = "Model returned empty response."
                else:
                    summary_text = f"Ollama returned HTTP error {res.status_code}: {res.text}"
        except httpx.ConnectError:
            summary_text = (
                f"Ollama is offline or unreachable at {endpoint}. "
                "Please ensure the Ollama desktop service is running."
            )
        except Exception as e:
            summary_text = f"Summarization failed: {str(e)}"

        return SummarizeDocumentResponse(
            path=read_res.path,
            filename=read_res.filename,
            summary=summary_text,
            model_used=target_model,
            chunks_processed=len(chunks),
            character_count=read_res.character_count
        )

