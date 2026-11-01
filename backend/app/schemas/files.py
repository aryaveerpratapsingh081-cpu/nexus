from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class FileInfo(BaseModel):
    name: str
    path: str
    size_bytes: int
    size_formatted: str
    extension: str
    is_directory: bool
    modified_at: datetime
    modified_formatted: str
    readable: bool = True

class FileSearchRequest(BaseModel):
    query: str = Field("", description="Substring or pattern to search for in filenames")
    extension: Optional[str] = Field(None, description="Optional extension filter, e.g. '.pdf' or 'pdf'")
    directory: Optional[str] = Field(None, description="Optional root directory to search within (must be approved)")
    max_results: int = Field(50, ge=1, le=200)

class FileSearchResponse(BaseModel):
    results: List[FileInfo]
    total_found: int
    searched_directories: List[str]

class ReadDocumentRequest(BaseModel):
    path: str = Field(..., description="Absolute or relative path to the document (must be inside approved dir)")

class ReadDocumentResponse(BaseModel):
    path: str
    filename: str
    file_type: str
    page_count: Optional[int] = None
    character_count: int
    content: str
    is_truncated: bool
    is_scanned_pdf: bool = False
    warning: Optional[str] = None

class SummarizeDocumentRequest(BaseModel):
    path: str = Field(..., description="Path to the document to summarize")
    model: Optional[str] = None

class SummarizeDocumentResponse(BaseModel):
    path: str
    filename: str
    summary: str
    model_used: str
    chunks_processed: int
    character_count: int

class CreateFolderRequest(BaseModel):
    parent_directory: str = Field(..., description="Approved parent directory path")
    folder_name: str = Field(..., min_length=1, max_length=150, description="Clean folder name to create")

class CreateFolderResponse(BaseModel):
    success: bool
    created_path: str
    message: str

