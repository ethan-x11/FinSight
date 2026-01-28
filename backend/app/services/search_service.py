from __future__ import annotations

from typing import Any, Dict, Iterable, List

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SearchableField,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)

from app.core.config import get_settings


class SearchService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.search_endpoint or not settings.search_admin_key:
            raise RuntimeError("Azure Search configuration missing")
        credential = AzureKeyCredential(settings.search_admin_key)
        self.index_name = settings.search_index_name
        self.index_client = SearchIndexClient(endpoint=settings.search_endpoint, credential=credential)
        self.search_client = SearchClient(endpoint=settings.search_endpoint, index_name=self.index_name, credential=credential)
        self.embed_dims = settings.azure_openai_embed_dims
        self.ensure_index()

    def ensure_index(self) -> None:
        try:
            self.index_client.get_index(self.index_name)
            return
        except ResourceNotFoundError:
            pass
        except Exception:
            # Bubble up unexpected errors instead of masking them.
            raise

        fields: List[SearchField] = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="en.lucene", sortable=False),
            SimpleField(name="sessionId", type=SearchFieldDataType.String, filterable=True, sortable=True, facetable=True),
            SimpleField(name="chunkId", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="sourcefile", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="pageRange", type=SearchFieldDataType.String, filterable=True),
            SearchField(name="embedding", type=SearchFieldDataType.Collection(SearchFieldDataType.Single), vector_search_dimensions=self.embed_dims, vector_search_profile_name="vector-profile"),
        ]

        vector_search = VectorSearch(
            algorithms=[
                HnswAlgorithmConfiguration(
                    name="hnsw",
                    parameters=HnswParameters(),
                )
            ],
            profiles=[VectorSearchProfile(name="vector-profile", algorithm_configuration_name="hnsw")],
        )

        index = SearchIndex(name=self.index_name, fields=fields, vector_search=vector_search)
        self.index_client.create_or_update_index(index)

    def upload_chunks(self, documents: Iterable[Dict[str, Any]]) -> None:
        self.search_client.upload_documents(list(documents))

    def search(self, query: str, top: int = 5, filter_session: str | None = None) -> List[Dict[str, Any]]:
        search_kwargs: Dict[str, Any] = {"top": top}
        if filter_session:
            search_kwargs["filter"] = f"sessionId eq '{filter_session}'"
        results = self.search_client.search(search_text=query, **search_kwargs)
        hits: List[Dict[str, Any]] = []
        for item in results:
            hits.append({"id": item["id"], "content": item["content"], "chunkId": item.get("chunkId"), "sourcefile": item.get("sourcefile"), "pageRange": item.get("pageRange")})
        return hits
