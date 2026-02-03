from __future__ import annotations

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
from app.repositories.sessions import SessionsRepository


class SearchService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.search_endpoint or not settings.search_admin_key:
            raise RuntimeError("Azure Search configuration missing")
        credential = AzureKeyCredential(settings.search_admin_key)
        self._endpoint = settings.search_endpoint
        self.index_client = SearchIndexClient(endpoint=self._endpoint, credential=credential)
        self._credential = credential
        self._search_clients: Dict[str, SearchClient] = {}
        self._known_indices: Set[str] = set()
        self.embed_dims = settings.azure_openai_embed_dims
        self.sessions_repo = SessionsRepository()


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
            SimpleField(name="documentUrl", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="pageRange", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="documentPageNumber", type=SearchFieldDataType.String, filterable=True),
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

    def delete_indices_with_prefix(self, index_base_name: str) -> List[str]:
        """Delete all search indexes whose names start with the given base and return the deleted names."""
        index_names = [name for name in self.index_client.list_index_names() if name.startswith(index_base_name)]
        deleted: List[str] = []
        for name in index_names:
            try:
                self.index_client.delete_index(name)
                deleted.append(name)
                self._known_indices.discard(name)
                self._search_clients.pop(name, None)
            except ResourceNotFoundError:
                # Another process may have removed the index; continue gracefully.
                continue
        return deleted

    def delete_indices(self, index_names: Iterable[str]) -> List[str]:
        """Delete specific indexes by name, returning the names successfully processed."""
        deleted: List[str] = []
        for name in set(index_names):
            if not name:
                continue
            try:
                self.index_client.delete_index(name)
                deleted.append(name)
                self._known_indices.discard(name)
                self._search_clients.pop(name, None)
            except ResourceNotFoundError:
                deleted.append(name)
        return deleted

    def upload_chunks(self, index_name: str, documents: Iterable[Dict[str, Any]]) -> None:
        # index_name = self._build_index_name(session_id + filename)
        self._ensure_index(index_name)
        # self.sessions_repo.update_document_index(session_id, filename, index_name)
        search_client = self._get_search_client(index_name)
        search_client.upload_documents(list(documents))

    def search(self, session_id: str, query: str, top: int = 5) -> List[Dict[str, Any]]:
        search_data: List[Dict[str, Any]] = []
        documents = self.sessions_repo.get_document_data(session_id)
        for doc in documents:
            index_name = doc["indexName"]
            print("Searching in file / index: ", doc["fileName"]," / ", index_name)
            # self._ensure_index(index_name)
            search_client = self._get_search_client(index_name)
            results = search_client.search(search_text=query, query_type="semantic", top=top)
            hits: List[Dict[str, Any]] = []
            for item in results:
                hits.append({
                    "id": item["id"],
                    "content": item["content"],
                    "chunkId": item.get("chunkId"),
                    "sourcefile": item.get("sourcefile"),
                    "pageRange": item.get("pageRange"),
                    "documentUrl": item.get("documentUrl"),
                    "documentPageNumber": item.get("documentPageNumber"),
                })
            search_data.extend(hits)
        return search_data
    
    def search_single(self, index_name: str, query: str, top: int = 5) -> List[Dict[str, Any]]:
        search_data: List[Dict[str, Any]] = []
        search_client = self._get_search_client(index_name)
        results = search_client.search(search_text=query, query_type="semantic", top=top)
        hits: List[Dict[str, Any]] = []
        for item in results:
            hits.append({
                "id": item["id"],
                "content": item["content"],
                "chunkId": item.get("chunkId"),
                "sourcefile": item.get("sourcefile"),
                "pageRange": item.get("pageRange"),
                "documentUrl": item.get("documentUrl"),
                "documentPageNumber": item.get("documentPageNumber"),
            })
        search_data.extend(hits)
        return search_data


if __name__ == "__main__":
    service = SearchService()
    #delete all indexes with prefix "test-index-"
    deleted = service.delete_indices_with_prefix("financial")
    print("Deleted indexes: ", deleted)