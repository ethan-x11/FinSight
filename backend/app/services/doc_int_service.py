from __future__ import annotations

from typing import Any, Dict, List

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, ContentFormat
from azure.core.exceptions import ResourceNotFoundError
from azure.core.credentials import AzureKeyCredential

from app.core.config import get_settings


class DocumentIntelligenceService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.docint_endpoint or not settings.docint_key:
            raise RuntimeError("Document Intelligence configuration missing")

        self.client = DocumentIntelligenceClient(
            endpoint=settings.docint_endpoint,
            credential=AzureKeyCredential(settings.docint_key),
            api_version=settings.docint_api_version,
        )

    def analyze_document(self, blob_url: str) -> Dict[str, Any]:
        print("Analyzing document at URL:", blob_url)
        try:
            poller = self.client.begin_analyze_document(
                "prebuilt-layout",
                AnalyzeDocumentRequest(url_source=blob_url),
                output_content_format=ContentFormat.MARKDOWN,
            )
        except ResourceNotFoundError as e:
            print("Document Intelligence 404. Likely blob SAS is invalid or expired. URL:", blob_url)
            raise
        except Exception as e:
            print("Error initiating document analysis:", e, "URL:", blob_url)
            raise
        
        result = poller.result()

        text_content = result.content or ""
        tables: List[Dict[str, Any]] = []
        page_spans: List[Dict[str, int]] = []

        for table in result.tables or []:
            rows: List[Dict[str, Any]] = []
            for row_idx in range(table.row_count):
                row_cells = {
                    f"c{cell.column_index}": cell.content for cell in table.cells if cell.row_index == row_idx
                }
                rows.append(row_cells)

            page_number = table.bounding_regions[0].page_number if table.bounding_regions else 1
            caption = getattr(table, "caption", None)
            caption_text = caption.content if caption and getattr(caption, "content", None) else ""

            tables.append(
                {
                    "tableId": f"table-{page_number}-{len(tables)+1}",
                    "title": caption_text or f"Table {len(tables)+1}",
                    "pageNumber": page_number,
                    "layoutType": "horizontal",
                    "rows": rows,
                }
            )

        for page in result.pages or []:
            if not page.spans:
                continue

            valid_spans = [span for span in page.spans if span.length]
            if not valid_spans:
                continue

            start_offset = min(span.offset for span in valid_spans)
            end_offset = max(span.offset + span.length for span in valid_spans)
            page_spans.append(
                {
                    "pageNumber": page.page_number,
                    "startOffset": start_offset,
                    "endOffset": end_offset,
                }
            )

        page_spans.sort(key=lambda entry: entry["startOffset"])
        return {"text": text_content, "tables": tables, "pageSpans": page_spans}
