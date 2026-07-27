import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.config.database import get_db, SessionLocal
from app.services.upload_service import UploadService
from app.schemas.upload import UploadResponse, UploadStatusResponse
from app.config.settings import settings
from app.config.rate_limit import limiter

router = APIRouter(prefix="/upload", tags=["Upload"])


def process_upload_task(upload_id: int, content: bytes, filename: str):
    """Background worker wrapper with isolated DB session."""
    db = SessionLocal()
    try:
        svc = UploadService(db)
        svc.process_upload(upload_id, content, filename)
    finally:
        db.close()


@router.post("", response_model=UploadResponse, status_code=202)
@limiter.limit(settings.rate_limit_upload)
async def upload_csv(
    request: Request,
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

    # Process asynchronously in background with isolated session
    background_tasks.add_task(
        process_upload_task,
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

@router.get("", response_model=list[UploadStatusResponse])
def get_all_uploads(db: Session = Depends(get_db)):
    """List all uploaded datasets."""
    svc = UploadService(db)
    return svc.get_all_uploads()

@router.post("/{upload_id}/active")
def set_active_upload(upload_id: int, db: Session = Depends(get_db)):
    """Set a dataset as the active one."""
    svc = UploadService(db)
    svc.set_active_upload(upload_id)
    return {"status": "success"}

@router.delete("/{upload_id}")
def delete_upload(upload_id: int, db: Session = Depends(get_db)):
    """Delete a dataset and all its associated data."""
    svc = UploadService(db)
    success = svc.delete_upload(upload_id)
    if not success:
        raise HTTPException(status_code=404, detail="Upload not found")
    return {"status": "success"}

@router.post("/demo", response_model=UploadResponse, status_code=202)
def load_demo(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Load the demo dataset."""
    try:
        svc = UploadService(db)
        # Using synchronous process for demo since it's small, or we could just use normal flow
        upload = svc.load_demo_data()
        return UploadResponse(
            upload_id=upload.id,
            filename=upload.filename,
            file_size=upload.file_size,
            status="completed",
            message="Demo dataset loaded successfully."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
