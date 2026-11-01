from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ChatMessagePayload(BaseModel):
    role: str
    content: str
    thinking: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = "default"
    model: Optional[str] = None
    include_history: bool = True

class ToolCallLog(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thinking: Optional[str] = None
    model_used: str
    tool_executions: List[ToolCallLog] = []
    session_id: str

