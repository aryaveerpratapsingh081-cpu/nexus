from typing import List, Optional
from pydantic import BaseModel, Field

class ApprovedDirectoryItem(BaseModel):
    id: int
    path: str
    alias: str
    is_default: bool

class AddDirectoryRequest(BaseModel):
    path: str = Field(..., min_length=1)
    alias: str = Field(..., min_length=1)

class OllamaModelItem(BaseModel):
    name: str
    size_bytes: Optional[int] = None
    size_formatted: Optional[str] = None
    modified_at: Optional[str] = None
    details: Optional[dict] = None

class OllamaStatusResponse(BaseModel):
    is_available: bool
    endpoint: str
    model_count: int
    models: List[OllamaModelItem]
    default_model: str
    selected_model: str
    is_selected_model_available: bool
    error_message: Optional[str] = None
    troubleshooting_guide: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    ollama_endpoint: Optional[str] = None
    selected_model: Optional[str] = None
    system_monitor_refresh_interval: Optional[int] = Field(None, ge=1, le=60)
    max_file_size_mb: Optional[int] = Field(None, ge=1, le=100)

class AllSettingsResponse(BaseModel):
    ollama_endpoint: str
    selected_model: str
    system_monitor_refresh_interval: int
    max_file_size_mb: int
    approved_directories: List[ApprovedDirectoryItem]

