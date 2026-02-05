from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlsplit, urlunsplit


class CitationUtils:
    @staticmethod
    def build_citation_url(
        document_url: Optional[str],
        page_start: Optional[int],
        text_snapshot: Optional[str],
    ) -> Optional[str]:
        if not document_url:
            return None
        try:
            parts = urlsplit(document_url)
            fragment_parts: List[str] = []
            if parts.fragment:
                fragment_parts.append(parts.fragment)
            if page_start:
                fragment_parts.append(f"page={page_start}")
            if text_snapshot:
                fragment_parts.append(f"search={quote(' '.join(text_snapshot.split()[:4]))}")
            fragment = "&".join([p for p in fragment_parts if p])
            return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, fragment))
        except Exception:
            return document_url

    @classmethod
    def build_linked_citations(
        cls, answer: str, context_docs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not answer:
            return []

        citation_pattern = re.compile(
            r"(?:chunk)?\[(?:Source:\s*)?(?P<sourcefile>[^,\]]+),\s*Page\s*(?P<page>[^,\]]+),\s*Chunk\s*(?P<chunk>[^,\]]+),\s*[\"\u201c]?(?P<snippet>.*?)[\"\u201d]?\]",
            re.IGNORECASE | re.DOTALL,
        )

        url_lookup: Dict[str, Optional[str]] = {}
        for doc in context_docs:
            sourcefile = doc.get("sourcefile")
            if isinstance(sourcefile, str) and sourcefile:
                url_lookup[sourcefile.strip().lower()] = doc.get("documentUrl")

        linked: List[Dict[str, Any]] = []
        for match in citation_pattern.finditer(answer):
            raw_cite = match.group(0)
            sourcefile = match.group("sourcefile").strip()
            page_raw = match.group("page").strip()
            chunk_id = match.group("chunk").strip()
            text_snapshot = match.group("snippet").strip()

            page_start = None
            page_end = None
            matched_doc = None
            page_range = ""
            for doc in context_docs:
                doc_source = doc.get("sourcefile")
                if (
                    isinstance(doc_source, str)
                    and doc_source.strip().lower() == sourcefile.lower()
                    and str(doc.get("chunkId", "")).strip() == chunk_id
                ):
                    matched_doc = doc
                    break

            if matched_doc:
                page_value = str(matched_doc.get("documentPageNumber") or "").strip()
                page_range = matched_doc.get("pageRange") or ""
                if page_value:
                    parts = page_value.split("-", 1)
                    try:
                        page_start = int(parts[0])
                    except (TypeError, ValueError):
                        page_start = None
                    if len(parts) > 1:
                        try:
                            page_end = int(parts[1])
                        except (TypeError, ValueError):
                            page_end = page_start
                    else:
                        page_end = page_start

            if page_start is None and page_end is None:
                page_nums = [int(num) for num in re.findall(r"\d+", page_raw)]
                page_start = page_nums[0] if page_nums else None
                page_end = page_nums[1] if len(page_nums) > 1 else page_start

            document_url = url_lookup.get(sourcefile.lower())
            if not document_url:
                for doc in context_docs:
                    doc_source = doc.get("sourcefile")
                    if isinstance(doc_source, str) and doc_source.lower() in raw_cite.lower():
                        document_url = doc.get("documentUrl")
                        break

            url = cls.build_citation_url(document_url, page_start, text_snapshot)
            linked.append(
                {
                    "raw_cite": raw_cite,
                    "url": url,
                    "sourcefile": sourcefile,
                    "page_start": page_start,
                    "page_end": page_end,
                    "chunk_id": chunk_id,
                    "text_snapshot": text_snapshot,
                    "page_range": page_range,
                }
            )

        return linked

    @staticmethod
    def replace_citation_snapshots(
        answer: str, linked_citations: List[Dict[str, Any]]
    ) -> str:
        if not answer or not linked_citations:
            return answer

        updated = answer
        for citation in linked_citations:
            raw_cite = citation.get("raw_cite")
            url = citation.get("url")
            if not raw_cite or not url:
                continue

            sourcefile = citation.get("sourcefile") or ""
            page_range = citation.get("page_range") or ""
            if not page_range:
                page_start = citation.get("page_start")
                page_end = citation.get("page_end")
                if page_start is not None:
                    page_range = (
                        f"{page_start}-{page_end}"
                        if page_end is not None and page_end != page_start
                        else f"{page_start}"
                    )
            label = sourcefile + f", Page - {page_range}" if page_range else ""
            replacement = f"[{label}]({url})"
            updated = updated.replace(raw_cite, replacement)

        return updated
