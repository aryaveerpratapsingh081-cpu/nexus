from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.app_service import AppService
from app.security.validator import AppSecurityError
from app.schemas.apps import AppInfo, RegisterAppRequest, LaunchAppRequest, LaunchAppResponse

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("", response_model=List[AppInfo])
def list_applications(
    query: Optional[str] = Query(None, description="Optional search filter"),
    db: Session = Depends(get_db)
):
    return AppService.list_apps(db, query)

@router.post("/register", response_model=AppInfo)
def register_application(req: RegisterAppRequest, db: Session = Depends(get_db)):
    try:
        return AppService.register_app(req, db)
    except AppSecurityError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/launch", response_model=LaunchAppResponse)
def launch_application(req: LaunchAppRequest, db: Session = Depends(get_db)):
    try:
        res = AppService.launch_app(req.app_id, req.arguments, db)
        if not res.success:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=res.message)
        return res
    except AppSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{app_id}")
def delete_application(app_id: str, db: Session = Depends(get_db)):
    try:
        deleted = AppService.delete_app(app_id, db)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found.")
        return {"success": True, "message": f"App '{app_id}' removed from allowlist."}
    except AppSecurityError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

