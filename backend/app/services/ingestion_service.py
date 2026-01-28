from __future__ import annotations

import logging
from itertools import islice
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Iterator, List
from uuid import uuid4

from tqdm import tqdm

from app.repositories.sessions import SessionsRepository
from app.services.blob_service import BlobService
from app.services.chat_service import ChatService
from app.services.doc_int_service import DocumentIntelligenceService
from app.services.search_service import SearchService
from app.utils.chunking import semantic_chunk_text

logger = logging.getLogger(__name__)

CHUNK_BATCH_SIZE = 24
DEFAULT_CHUNK_SIZE = 1200
DEFAULT_CHUNK_OVERLAP = 200
MAX_CHUNKS_PER_DOCUMENT = 220


class IngestionService:
    def __init__(self) -> None:
        self.sessions_repo = SessionsRepository()
        self.blob_service = BlobService()
        self.doc_service = DocumentIntelligenceService()
        self.search_service = SearchService()
        self.chat_service = ChatService()

    def run(
        self,
        session_id: str,
        filename: str,
        file_bytes: bytes | None,
        content_type: str | None,
        blob_url: str | None = None,
        blob_name: str | None = None,
    ) -> None:
        session = self.sessions_repo.get_by_id(session_id)
        if not session:
            logger.error("Session %s not found for ingestion", session_id)
            return

        status = session.get("systemStatus", {}) or {}
        steps = status.get("steps", {}) or {}
        try:
            status["overallStatus"] = "processing"
            steps["docIntelligenceTriggered"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            # Use provided blob if already uploaded; otherwise upload now
            if not blob_url:
                if file_bytes is None:
                    raise ValueError("file_bytes is required when blob_url is not provided")
                blob_name, blob_url = self.blob_service.upload_file(filename, file_bytes, content_type)

            session["sourceDocument"]["blobPath"] = blob_name or session["sourceDocument"].get("blobPath", "")
            session["sourceDocument"]["blobContainer"] = self.blob_service.container_name
            session["sourceDocument"]["blobUrl"] = blob_url
            self.sessions_repo.upsert_session(session)

            doc_result = self.doc_service.analyze_document(blob_url)
            steps["dataExtracted"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            text_content = doc_result.get("text", "")
            chunk_idx = 0
            any_chunks = False

            # Scale chunking to keep the total number of chunks manageable
            total_chars = len(text_content)
            target_chunk_size = max(
                DEFAULT_CHUNK_SIZE,
                (total_chars + MAX_CHUNKS_PER_DOCUMENT - 1) // MAX_CHUNKS_PER_DOCUMENT if total_chars else DEFAULT_CHUNK_SIZE,
            )
            chunk_overlap = min(DEFAULT_CHUNK_OVERLAP, target_chunk_size // 6)

            # Stream chunk batches to avoid holding the full chunk list in memory
            chunk_batches = self._batched(
                semantic_chunk_text(text_content, chunk_size=target_chunk_size, overlap=chunk_overlap),
                CHUNK_BATCH_SIZE,
            )

            for chunk_batch in tqdm(chunk_batches, desc="Ingesting Batches", unit="batch"):
                any_chunks = True
                steps["chunksGenerated"] = True
                status["steps"] = steps
                self.sessions_repo.update_status(session_id, status)

                embeddings = self.chat_service.embed_texts(chunk_batch)
                steps["embeddingsGenerated"] = True
                status["steps"] = steps
                self.sessions_repo.update_status(session_id, status)

                documents: List[Dict[str, Any]] = []
                for batch_idx, chunk in enumerate(chunk_batch):
                    chunk_idx += 1
                    documents.append(
                        {
                            "id": f"{session_id}-chunk-{chunk_idx}",
                            "sessionId": session_id,
                            "chunkId": f"chunk-{chunk_idx}",
                            "content": chunk,
                            "sourcefile": filename,
                            "pageRange": None,
                            "embedding": embeddings[batch_idx],
                        }
                    )
                self.search_service.upload_chunks(session_id, documents)
            print("Total chunks ingested:", chunk_idx)

            if not any_chunks:
                raise ValueError("Document contained no extractable text to ingest")

            steps["searchIndexed"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            status["overallStatus"] = "completed"
            session["systemStatus"] = {"overallStatus": "completed", "steps": steps}
            if doc_result.get("tables"):
                session["analysisOutput"] = {
                    "keyInsights": [
                        {
                            "id": uuid4().hex,
                            "category": "Auto Insight",
                            "value": "Document processed",
                            "trend": None,
                            "confidenceScore": 0.6,
                        }
                    ],
                    "identifiedRisks": [],
                    "structuredTables": doc_result.get("tables"),
                }
            session["timestamp"] = datetime.now(timezone.utc).isoformat()
            self.sessions_repo.upsert_session(session)
        except Exception as exc:  # pragma: no cover
            logger.exception("Ingestion failed: %s", exc)
            status["overallStatus"] = "failed"
            status["errorMessage"] = str(exc)
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

    @staticmethod
    def _batched(iterable: Iterable[str], batch_size: int) -> Iterator[List[str]]:
        """Collect items from an iterable into fixed-size batches."""

        iterator = iter(iterable)
        while True:
            batch = list(islice(iterator, batch_size))
            if not batch:
                break
            yield batch
