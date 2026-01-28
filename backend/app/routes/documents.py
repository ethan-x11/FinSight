from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status

from app.core.auth import get_current_user
from app.repositories.sessions import SessionsRepository, get_sessions_repository
from app.models.document import UploadResponse
from app.models.session import SessionCreate, SessionMetadata, SourceDocument
from app.models.user import UserInDB
from app.services.blob_service import BlobService

from app.services.ingestion_service import IngestionService
# IngestionService is instantiated per request to avoid startup failures when Azure config is missing in dev
router = APIRouter(tags=["documents"], dependencies=[Depends(get_current_user)])


@router.post("/documents/upload", response_model=UploadResponse)
async def upload_financial_doc(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = "Untitled Session",
    current_user: UserInDB = Depends(get_current_user),
    sessions_repo: SessionsRepository = Depends(get_sessions_repository),
) -> UploadResponse:
    try:
        file_bytes = await file.read()
    finally:
        await file.close()

    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")

    now = datetime.now(timezone.utc)
    metadata = SessionMetadata(title=title, createdAt=now, lastAccessed=now, isActive=True)
    blob_service = BlobService()
    blob_name, blob_url = blob_service.upload_file(f"{file.filename}", file_bytes, file.content_type)

    source = SourceDocument(
        fileName=f"{file.filename}",
        fileSize=f"{len(file_bytes) / 1024:.2f}KB",
        blobPath=blob_name,
        blobContainer=blob_service.container_name,
    )

    session_payload = SessionCreate(userId=current_user.id, metadata=metadata, sourceDocument=source)
    session_record = sessions_repo.create_session(session_payload.model_dump(mode="json"))

    ingestion_service = IngestionService()
    background_tasks.add_task(
        ingestion_service.run,
        session_record["id"],
        f"{file.filename}",
        None,  # bytes not needed since blob already uploaded
        file.content_type,
        blob_url,
        blob_name,
    )

    return UploadResponse(
        sessionId=session_record["id"],
        blobName=blob_name,
        blobUrl=blob_url,
        indexerRunStarted=True,
        createdAt=now,
    )
