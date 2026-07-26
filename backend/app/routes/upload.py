import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.upload_service import UploadService
from app.schemas.upload import UploadResponse, UploadStatusResponse
from app.config.settings import settings

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("", response_model=UploadResponse, status_code=202)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a retail CSV or XLSX file (UCI Online Retail II format).
    Processing runs in the background. Poll /upload/{id}/status for progress.
    """
    content = await file.read()
    svc = UploadService(db)

    # Pre-validation (fast checks before DB record)
    error = svc.validate_file_meta(file.filename, content)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Create upload record
    upload = svc.create_upload_record(file.filename, len(content))

    # Process asynchronously in background
    background_tasks.add_task(
        svc.process_upload,
        upload.id,
        content,
        file.filename,
    )

    return UploadResponse(
        upload_id=upload.id,
        filename=upload.filename,
        file_size=len(content),
        status="processing",
        message="File accepted. Processing in background. Poll /upload/{id}/status for updates.",
    )


@router.get("/{upload_id}/status", response_model=UploadStatusResponse)
def get_upload_status(upload_id: int, db: Session = Depends(get_db)):
    """Poll the processing status of an uploaded file."""
    svc = UploadService(db)
    upload = svc.get_status(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail=f"Upload {upload_id} not found.")
    return upload
