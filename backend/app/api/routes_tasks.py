from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.task_service import TaskService
from app.schemas.tasks import TaskListResponse, ClearTasksResponse

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=TaskListResponse)
def get_task_history(
    status: Optional[str] = Query(None, description="Status filter: 'success', 'failed', 'all'"),
    search: Optional[str] = Query(None, description="Search term in request or summary"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return TaskService.get_tasks(db, status=status, search=search, page=page, page_size=page_size)

@router.delete("", response_model=ClearTasksResponse)
def clear_tasks(db: Session = Depends(get_db)):
    return TaskService.clear_tasks(db)

