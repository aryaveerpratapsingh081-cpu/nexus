from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class TaskItem(BaseModel):
    id: int
    timestamp: datetime
    user_request: str
    tool_name: Optional[str] = None
    tool_arguments: Optional[str] = None
    status: str
    summary: str
    error_details: Optional[str] = None
    duration_ms: Optional[float] = None

class TaskListResponse(BaseModel):
    tasks: List[TaskItem]
    total: int
    page: int
    page_size: int

class ClearTasksResponse(BaseModel):
    deleted_count: int
    message: str

