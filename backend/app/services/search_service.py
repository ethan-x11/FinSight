from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Set

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
    SemanticSearch, 
    SemanticConfiguration, 
    SemanticPrioritizedFields, 
    SemanticField
)

from app.core.config import get_settings


class SearchService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.search_endpoint or not settings.search_admin_key:
            raise RuntimeError("Azure Search configuration missing")
        credential = AzureKeyCredential(settings.search_admin_key)
        self.index_base_name = settings.search_index_name
        self._endpoint = settings.search_endpoint
        self.index_client = SearchIndexClient(endpoint=self._endpoint, credential=credential)
        self._credential = credential
        self._search_clients: Dict[str, SearchClient] = {}
        self._known_indices: Set[str] = set()
        self.embed_dims = settings.azure_openai_embed_dims

    def _build_index_name(self, session_id: str) -> str:
        sanitized = session_id.strip().lower()
        sanitized = re.sub(r"[^a-z0-9-]", "-", sanitized)
        sanitized = sanitized.lstrip("-") or "session"
        max_suffix = 128 - len(self.index_base_name)
        if max_suffix <= 0:
            raise ValueError("Configured search index base name is too long to append session identifiers")
        sanitized = sanitized[:max_suffix]
        return f"{self.index_base_name}{sanitized}"

    def _ensure_index(self, index_name: str) -> None:
        if index_name in self._known_indices:
            return
        try:
            self.index_client.get_index(index_name)
            self._known_indices.add(index_name)
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
        
        semantic_search=SemanticSearch(
        default_configuration_name="semantic_config",
        configurations=[
            SemanticConfiguration(
                name="semantic_config",
                prioritized_fields=SemanticPrioritizedFields(
                    content_fields=[
                        SemanticField(field_name="content")
                    ]
                )
            )
        ]
        )

        index = SearchIndex(name=index_name, fields=fields, vector_search=vector_search, semantic_search=semantic_search)
        self.index_client.create_or_update_index(index)
        self._known_indices.add(index_name)

    def _get_search_client(self, index_name: str) -> SearchClient:
        if index_name not in self._search_clients:
            self._search_clients[index_name] = SearchClient(
                endpoint=self._endpoint,
                index_name=index_name,
                credential=self._credential,
            )
        return self._search_clients[index_name]

    def upload_chunks(self, session_id: str, documents: Iterable[Dict[str, Any]]) -> None:
        # index_name = self._build_index_name(session_id)
        index_name = self.index_base_name
        self._ensure_index(index_name)
        search_client = self._get_search_client(index_name)
        search_client.upload_documents(list(documents))

    def search(self, session_id: str, query: str, top: int = 5) -> List[Dict[str, Any]]:
        index_name = self.index_base_name
        self._ensure_index(index_name)
        search_client = self._get_search_client(index_name)
        results = search_client.search(search_text=query, query_type="semantic", top=top)
        hits: List[Dict[str, Any]] = []
        for item in results:
            hits.append({"id": item["id"], "content": item["content"], "chunkId": item.get("chunkId"), "sourcefile": item.get("sourcefile"), "pageRange": item.get("pageRange")})
        return hits
