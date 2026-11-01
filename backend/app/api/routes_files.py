from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.file_service import FileService
from app.services.doc_service import DocService
from app.security.path_guard import PathSecurityError, FileSizeExceededError, PathNotFoundError
from app.schemas.files import (
    FileSearchResponse,
    ReadDocumentRequest,
    ReadDocumentResponse,
    SummarizeDocumentRequest,
    SummarizeDocumentResponse,
    CreateFolderRequest,
    CreateFolderResponse,
)

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("/search", response_model=FileSearchResponse)
def search_files(
    query: str = Query("", description="Filename query"),
    extension: Optional[str] = Query(None, description="Optional extension"),
    directory: Optional[str] = Query(None, description="Approved folder"),
    max_results: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    try:
        return FileService.search_files(
            query=query,
            extension=extension,
            directory=directory,
            db=db,
            max_results=max_results
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except PathNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/read", response_model=ReadDocumentResponse)
def read_document(req: ReadDocumentRequest, db: Session = Depends(get_db)):
    try:
        return FileService.read_document(req.path, db)
    except PathSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileSizeExceededError as e:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e))
    except PathNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/summarize", response_model=SummarizeDocumentResponse)
async def summarize_document(req: SummarizeDocumentRequest, db: Session = Depends(get_db)):
    try:
        return await DocService.summarize_document_async(req.path, db, model=req.model)
    except PathSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except PathNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/create-folder", response_model=CreateFolderResponse)
def create_folder(req: CreateFolderRequest, db: Session = Depends(get_db)):
    try:
        return FileService.create_folder(req.parent_directory, req.folder_name, db)
    except PathSecurityError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except PathNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

