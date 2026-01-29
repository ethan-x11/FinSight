from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.document import BlobMeta, UploadResponse
from app.models.session import SessionCreate, SessionMetadata, SessionUpdate, SourceDocument
from app.models.user import UserInDB
from app.services.blob_service import BlobService

from app.services.ingestion_service import IngestionService
# IngestionService is instantiated per request to avoid startup failures when Azure config is missing in dev
router = APIRouter(tags=["documents"], dependencies=[Depends(get_current_user)])


@router.post("/documents/upload", response_model=UploadResponse)
async def upload_financial_doc(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    title: str = "Untitled Session",
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> UploadResponse:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    blob_service = BlobService()
    ingestion_service = IngestionService()

    sources = []
    session_id = ""
    blob_data: list[BlobMeta] = []
    
    for file in files:
        try:
            file_bytes = await file.read()
        finally:
            await file.close()

        if not file_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")

        now = datetime.now(timezone.utc)
        session_title = title or file.filename or "Untitled Session"
        metadata = SessionMetadata(title=session_title, createdAt=now, lastAccessed=now, isActive=True)
        blob_name, blob_url = blob_service.upload_file(f"{file.filename}", file_bytes, file.content_type)
        blob_data.append(BlobMeta(
            blobName=blob_name,
            blobUrl=blob_url,
        ))
        
        sources.append(SourceDocument(
            fileName=f"{file.filename}",
            fileSize=f"{len(file_bytes) / 1024:.2f}KB",
            blobPath=blob_name,
            blobContainer=blob_service.container_name,
        ))

        if not session_id:
            session_payload = SessionCreate(userId=current_user.id, metadata=metadata, sourceDocument=sources)
            session_record = sessions_repo.create_session(session_payload.model_dump(mode="json"))
            session_id = session_record["id"]
        else:
            session_payload = SessionUpdate(sourceDocument=sources)
            sessions_repo.append_source_document(session_id, session_payload.model_dump(mode="json")["sourceDocument"])

        background_tasks.add_task(
            ingestion_service.run,
            session_id,
            f"{file.filename}",
            None,
            file.content_type,
            blob_url,
            blob_name,
        )
        
        print(f"Started ingestion for session {session_id} for file {file.filename}")
        
    now = datetime.now(timezone.utc)
    return UploadResponse(
            sessionId=session_id,
            blobData=blob_data,
            indexerRunStarted=True,
            createdAt=now,
        )
