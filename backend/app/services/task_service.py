import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.models import TaskRecord
from app.schemas.tasks import TaskItem, TaskListResponse, ClearTasksResponse

class TaskService:
    @staticmethod
    def log_task(
        db: Session,
        user_request: str,
        summary: str,
        status: str = "success",
        tool_name: Optional[str] = None,
        tool_arguments: Optional[Dict[str, Any]] = None,
        error_details: Optional[str] = None,
        duration_ms: Optional[float] = None
    ) -> TaskRecord:
        """Persists a task execution record into SQLite."""
        args_str = json.dumps(tool_arguments) if tool_arguments else None
        
        record = TaskRecord(
            timestamp=datetime.now(timezone.utc),
            user_request=user_request[:500],  # Cap request preview
            tool_name=tool_name,
            tool_arguments=args_str,
            status=status,
            summary=summary[:1000],  # Keep summary concise
            error_details=error_details[:2000] if error_details else None,
            duration_ms=round(duration_ms, 2) if duration_ms is not None else None
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_tasks(
        db: Session,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> TaskListResponse:
        """Retrieves paginated task history with search and status filtering."""
        q = db.query(TaskRecord)

        if status and status.strip() and status != "all":
            q = q.filter(TaskRecord.status == status.strip().lower())

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            q = q.filter(
                TaskRecord.user_request.ilike(term) |
                TaskRecord.summary.ilike(term) |
                TaskRecord.tool_name.ilike(term)
            )

        total = q.count()
        offset = (page - 1) * page_size
        records = q.order_by(desc(TaskRecord.timestamp)).offset(offset).limit(page_size).all()

        items = [
            TaskItem(
                id=r.id,
                timestamp=r.timestamp,
                user_request=r.user_request,
                tool_name=r.tool_name,
                tool_arguments=r.tool_arguments,
                status=r.status,
                summary=r.summary,
                error_details=r.error_details,
                duration_ms=r.duration_ms
            )
            for r in records
        ]

        return TaskListResponse(
            tasks=items,
            total=total,
            page=page,
            page_size=page_size
        )

    @staticmethod
    def clear_tasks(db: Session) -> ClearTasksResponse:
        """Clears all stored task records upon user confirmation."""
        count = db.query(TaskRecord).delete()
        db.commit()
        return ClearTasksResponse(
            deleted_count=count,
            message=f"Cleared {count} task records."
        )

