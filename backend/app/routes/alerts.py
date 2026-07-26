from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.alert_service import AlertService
from app.repositories.alert_repo import AlertRepository

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def list_alerts(
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, pattern="^(low|medium|high)$"),
    is_resolved: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List inventory alerts, filterable by type, severity, and resolved status."""
    repo = AlertRepository(db)
    return repo.get_all(alert_type, severity, is_resolved, limit)


@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an inventory alert as resolved."""
    repo = AlertRepository(db)
    alert = repo.resolve(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    return {"id": alert.id, "is_resolved": alert.is_resolved, "resolved_at": alert.resolved_at}


@router.post("/generate")
def generate_alerts(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Re-run the full alert generation pipeline.
    Clears existing unresolved alerts and creates fresh ones.
    """
    svc = AlertService(db)
    count = svc.generate_all_alerts()
    return {
        "message": f"Successfully generated {count} inventory alerts.",
        "alerts_created": count,
    }
