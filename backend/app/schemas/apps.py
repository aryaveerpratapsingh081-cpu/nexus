from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class AppInfo(BaseModel):
    id: str
    name: str
    executable_path: str
    arguments: Optional[str] = None
    category: str = "General"
    icon: str = "AppWindow"
    is_builtin: bool = False
    is_available: bool = True

class RegisterAppRequest(BaseModel):
    id: Optional[str] = Field(None, description="Unique identifier (auto-slugged if empty)")
    name: str = Field(..., min_length=1, max_length=100)
    executable_path: str = Field(..., min_length=1, max_length=1000)
    arguments: Optional[str] = None
    category: Optional[str] = "General"
    icon: Optional[str] = "AppWindow"

class LaunchAppRequest(BaseModel):
    app_id: str = Field(..., description="Allowlisted application identifier")
    arguments: Optional[str] = None

class LaunchAppResponse(BaseModel):
    success: bool
    app_id: str
    app_name: str
    executable_path: str
    pid: Optional[int] = None
    message: str

