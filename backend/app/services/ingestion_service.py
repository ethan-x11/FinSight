from __future__ import annotations

import logging
from itertools import islice
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Iterator, List, Optional
from uuid import uuid4

from tqdm import tqdm

from app.repositories.sessions import SessionsRepository
from app.services.blob_service import BlobService
from app.services.chat_service import ChatService
from app.services.doc_int_service import DocumentIntelligenceService
from app.services.search_service import SearchService
from app.services.analysis_service import AnalysisService
from app.utils.chunking import semantic_chunk_text
from app.core.config import get_settings
import re

logger = logging.getLogger(__name__)

CHUNK_BATCH_SIZE = 50
DEFAULT_CHUNK_SIZE = 1200
DEFAULT_CHUNK_OVERLAP = 200
MAX_CHUNKS_PER_DOCUMENT = 220


class IngestionService:
    def __init__(self) -> None:
        settings = get_settings()
        self.sessions_repo = SessionsRepository()
        self.blob_service = BlobService()
        self.doc_service = DocumentIntelligenceService()
        self.search_service = SearchService()
        self.chat_service = ChatService()
        self.analysis_service = AnalysisService()
        self.index_base_name = settings.search_index_name

    @staticmethod
    def _pages_from_range(page_range: str | None) -> List[int]:
        if not page_range:
            return []
        try:
            if "-" in page_range:
                start, end = page_range.split("-", 1)
                return list(range(int(start), int(end) + 1))
            return [int(page_range)]
        except Exception:
            return []
        
    def _build_index_name(self, name: str) -> str:
        sanitized = name.strip().lower()
        sanitized = re.sub(r"[^a-z0-9-]", "-", sanitized)
        sanitized = sanitized.lstrip("-") or "session"
        max_suffix = 128 - len(self.index_base_name)
        if max_suffix <= 0:
            raise ValueError("Configured search index base name is too long to append session identifiers")
        sanitized = sanitized[:max_suffix]
        return f"{self.index_base_name}{sanitized}"
    
    
    def compute_page_range(
        self,
        start_offset: int,
        end_offset: int,
        page_spans,
        page_markers: List[Dict[str, int]] | None = None,
    ) -> str | None:
        start_page = self.resolve_page(start_offset, page_spans, page_markers)
        end_page = self.resolve_page(max(end_offset - 1, start_offset), page_spans, page_markers)
        if start_page is None and end_page is None:
            return None
        if start_page is None:
            start_page = end_page
        if end_page is None:
            end_page = start_page
        if start_page == end_page:
            return str(start_page)
        return f"{start_page}-{end_page}"
    
    def resolve_page(
        self,
        offset: int,
        page_spans,
        page_markers: List[Dict[str, int]] | None = None,
    ) -> int | None:
        if page_markers:
            for idx, marker in enumerate(page_markers):
                start = marker["offset"]
                end = page_markers[idx + 1]["offset"] if idx + 1 < len(page_markers) else None
                if end is None:
                    if offset >= start:
                        return marker["pageNumber"]
                else:
                    if start <= offset < end:
                        return marker["pageNumber"]

            if offset < page_markers[0]["offset"]:
                return page_markers[0]["pageNumber"]
            return page_markers[-1]["pageNumber"]

        if not page_spans:
            return None

        for entry in page_spans:
            start_offset = entry["startOffset"]
            end_offset = entry["endOffset"]
            if start_offset <= offset < end_offset:
                return entry["pageNumber"]

        if offset < page_spans[0]["startOffset"]:
            return page_spans[0]["pageNumber"]
        if offset >= page_spans[-1]["endOffset"]:
            return page_spans[-1]["pageNumber"]
        return None

    def run(
        self,
        session_id: str,
        filename: str,
        file_bytes: bytes | None,
        content_type: str | None,
        blob_url: str | None = None,
        blob_name: str | None = None,
        file_index: Optional[str] = "",
    ) -> None:
        session = self.sessions_repo.get_by_id(session_id)
        index_name = self._build_index_name(session_id + filename)
        if not session:
            logger.error("Session %s not found for ingestion", session_id)
            return

        status = session.get("systemStatus", {}) or {}
        steps = status.get("steps", {}) or {}
        steps = {key: False for key in steps}
        status["steps"] = steps
        self.sessions_repo.update_status(session_id, status)
        try:
            status["overallStatus"] = "processing" + (" " + file_index if file_index else "")
            steps["docIntelligenceTriggered"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            # Use provided blob if already uploaded; otherwise upload now
            if not blob_url:
                if file_bytes is None:
                    raise ValueError("file_bytes is required when blob_url is not provided")
                blob_name, blob_url = self.blob_service.upload_file(filename, file_bytes, content_type)

            # Normalize sourceDocument to a flat list of dicts
            raw_sources = session.get("sourceDocument") or []
            if isinstance(raw_sources, dict):
                source_documents = [raw_sources]
            else:
                source_documents = []
                for entry in raw_sources if isinstance(raw_sources, list) else []:
                    if isinstance(entry, dict):
                        source_documents.append(entry)
                    elif isinstance(entry, list):
                        source_documents.extend([e for e in entry if isinstance(e, dict)])

            target_doc = None
            if blob_name:
                for doc in source_documents:
                    if doc.get("blobPath") == blob_name or doc.get("fileName") == filename:
                        target_doc = doc
                        break

            if target_doc is None and source_documents:
                target_doc = source_documents[-1]

            if target_doc is None:
                target_doc = {
                    "fileName": filename,
                    "fileSize": f"{(len(file_bytes) or 0) / 1024:.2f}KB" if file_bytes else "",
                }
                source_documents.append(target_doc)

            target_doc["blobPath"] = blob_name or target_doc.get("blobPath", "")
            target_doc["blobContainer"] = self.blob_service.container_name
            target_doc["blobUrl"] = blob_url
            target_doc["indexName"] = index_name
            session["sourceDocument"] = source_documents
            self.sessions_repo.upsert_session(session)

            doc_result = self.doc_service.analyze_document(blob_url)
            steps["dataExtracted"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            text_content = doc_result.get("text", "")
            tables = doc_result.get("tables") or []
            footnotes = doc_result.get("footnotes") or []
            page_markers = self._extract_page_markers(text_content)
            page_spans = [
                span
                for span in doc_result.get("pageSpans") or []
                if span.get("startOffset") is not None and span.get("endOffset") is not None
            ]
            page_spans.sort(key=lambda entry: entry.get("startOffset", 0))

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

            steps["chunksGenerated"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            offset_cursor = 0
            for chunk_batch in tqdm(chunk_batches, desc="Ingesting Batches", unit="batch"):
                chunk_infos: List[Dict[str, Any]] = []
                local_cursor = max(offset_cursor, 0)
                for chunk in chunk_batch:
                    if not chunk:
                        continue

                    start_offset = text_content.find(chunk, local_cursor)
                    if start_offset == -1:
                        start_offset = text_content.find(chunk)
                    if start_offset == -1:
                        start_offset = local_cursor

                    end_offset = start_offset + len(chunk)
                    local_cursor = end_offset

                    while local_cursor < len(text_content) and text_content[local_cursor] in "\r\n \t":
                        local_cursor += 1

                    page_range = self.compute_page_range(start_offset, end_offset, page_spans, page_markers)
                    pages_for_chunk = self._pages_from_range(page_range)

                    # Collect notes: include table references and footnotes attached to pages
                    notes: List[str] = []
                    for table in tables:
                        table_pages = table.get("pageNumbers") or [table.get("pageNumber")]
                        if any(p in pages_for_chunk for p in table_pages if p is not None):
                            title = table.get("title") or "Table"
                            page_range_note = table.get("pageRange") or ",".join(str(p) for p in table_pages if p)
                            notes.append(f"Table: {title} (pages {page_range_note})")

                    for footnote in footnotes:
                        page_num = footnote.get("pageNumber")
                        if pages_for_chunk and page_num and page_num in pages_for_chunk:
                            content = footnote.get("content") or ""
                            if content:
                                notes.append(f"Footnote (p.{page_num}): {content}")

                    note_suffix = ""
                    if notes:
                        bullet_notes = "\n".join(f"- {n}" for n in notes)
                        note_suffix = f"\n\nNotes:\n{bullet_notes}"
                    content_with_notes = f"{chunk}{note_suffix}" if note_suffix else chunk

                    chunk_infos.append(
                        {
                            "content": content_with_notes,
                            "startOffset": start_offset,
                            "endOffset": end_offset,
                            "pageRange": page_range,
                            "notes": notes,
                        }
                    )

                if not chunk_infos:
                    continue

                offset_cursor = local_cursor
                any_chunks = True

                embeddings = self.chat_service.embed_texts([info["content"] for info in chunk_infos])
                steps["embeddingsGenerated"] = True
                # status["steps"] = steps
                # self.sessions_repo.update_status(session_id, status)

                documents: List[Dict[str, Any]] = []
                for batch_idx, chunk_info in enumerate(chunk_infos):
                    chunk_idx += 1
                    documents.append(
                        {
                            "id": f"{session_id}-chunk-{chunk_idx}",
                            "sessionId": session_id,
                            "chunkId": f"chunk-{chunk_idx}",
                            "content": chunk_info["content"],
                            "sourcefile": filename,
                            "pageRange": chunk_info["pageRange"],
                            "documentUrl": blob_url,
                            "embedding": embeddings[batch_idx],
                        }
                    )
                self.search_service.upload_chunks(index_name, documents)
            print("Total chunks ingested:", chunk_idx)

            if not any_chunks:
                raise ValueError("Document contained no extractable text to ingest")

            steps["searchIndexed"] = True
            status["steps"] = steps
            self.sessions_repo.update_status(session_id, status)

            status["overallStatus"] = "completed"
            session["systemStatus"] = {"overallStatus": "completed", "steps": steps}
            # if doc_result.get("tables"):
            
            insights = self.analysis_service.generate_insights(file_name=filename, index_name=index_name)
             
            if session["analysisOutput"] is None:
                session["analysisOutput"] = [insights.model_dump()]
            else:
                session["analysisOutput"].append(insights.model_dump())
            
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

    @staticmethod
    def _extract_page_markers(text: str) -> List[Dict[str, int]]:
        """Parse Document Intelligence markdown comments like <!-- PageNumber="206" --> to map offsets to pages."""

        if not text:
            return []

        pattern = re.compile(r"<!--\s*PageNumber=\"(?P<num>\d+)\"\s*-->", re.IGNORECASE)
        markers: List[Dict[str, int]] = []
        for match in pattern.finditer(text):
            try:
                page_number = int(match.group("num"))
            except ValueError:
                continue
            markers.append({"offset": match.start(), "pageNumber": page_number})

        markers.sort(key=lambda entry: entry["offset"])
        return markers
