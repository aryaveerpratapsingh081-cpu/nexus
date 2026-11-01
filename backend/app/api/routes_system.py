from fastapi import APIRouter
from app.services.system_service import SystemService
from app.schemas.system import SystemStatsResponse

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/stats", response_model=SystemStatsResponse)
def get_system_stats():
    return SystemService.get_system_stats()

