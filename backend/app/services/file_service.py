import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple
import fitz  # PyMuPDF
from sqlalchemy.orm import Session

from app.config import settings
from app.security.path_guard import PathGuard, PathSecurityError, FileSizeExceededError, PathNotFoundError
from app.schemas.files import FileInfo, FileSearchResponse, ReadDocumentResponse, CreateFolderResponse

def format_file_size(size_bytes: int) -> str:
    """Format bytes to human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

class FileService:
    @staticmethod
    def search_files(
        query: str,
        extension: Optional[str],
        directory: Optional[str],
        db: Session,
        max_results: int = 50
    ) -> FileSearchResponse:
        """
        Searches files within approved directories only.
        Protects against scanning entire drives and respects permission boundaries.
        """
        results: List[FileInfo] = []
        searched_dirs: List[str] = []

        if directory and directory.strip():
            # Validate that the requested directory is inside an approved root
            target_dir = PathGuard.validate_path_within_approved(directory.strip(), db, must_exist=True)
            if not target_dir.is_dir():
                raise PathSecurityError(f"Target path is not a directory: {target_dir}")
            search_roots = [target_dir]
        else:
            search_roots = PathGuard.get_approved_directories(db)

        clean_query = query.strip().lower() if query else ""
        clean_ext = extension.strip().lower() if extension else None
        if clean_ext and not clean_ext.startswith("."):
            clean_ext = f".{clean_ext}"

        for root in search_roots:
            searched_dirs.append(str(root))
            if not root.exists() or not root.is_dir():
                continue

            try:
                # Walk with safe depth to prevent infinite loops or huge scans
                for current_root, dirs, files in os.walk(root):
                    # Filter out hidden or protected directories
                    dirs[:] = [d for d in dirs if not d.startswith(".") and d.lower() not in ("$recycle.bin", "system volume information", "node_modules", ".git", "venv", "__pycache__")]
                    
                    for fname in files:
                        if fname.startswith("."):
                            continue
                        
                        fpath = Path(current_root) / fname
                        
                        # Match extension
                        if clean_ext and fpath.suffix.lower() != clean_ext:
                            continue
                        
                        # Match query in name
                        if clean_query and clean_query not in fname.lower():
                            continue

                        try:
                            stat = fpath.stat()
                            mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                            results.append(FileInfo(
                                name=fname,
                                path=str(fpath.resolve()),
                                size_bytes=stat.st_size,
                                size_formatted=format_file_size(stat.st_size),
                                extension=fpath.suffix.lower(),
                                is_directory=False,
                                modified_at=mtime,
                                modified_formatted=mtime.strftime("%Y-%m-%d %H:%M:%S"),
                                readable=os.access(fpath, os.R_OK)
                            ))
                            if len(results) >= max_results:
                                break
                        except (OSError, PermissionError):
                            continue

                    if len(results) >= max_results:
                        break
            except (OSError, PermissionError):
                continue

        return FileSearchResponse(
            results=results,
            total_found=len(results),
            searched_directories=searched_dirs
        )

    @staticmethod
    def read_document(file_path: str, db: Session, max_size_bytes: Optional[int] = None) -> ReadDocumentResponse:
        """
        Reads supported text files or PDFs strictly from approved directories.
        Extracts PDF text using PyMuPDF. Handles scanned PDFs gracefully.
        """
        resolved_path = PathGuard.validate_file_for_reading(file_path, db, max_size_bytes)
        ext = resolved_path.suffix.lower()
        stat = resolved_path.stat()
        file_size = stat.st_size
        filename = resolved_path.name

        text_content = ""
        is_scanned = False
        page_count: Optional[int] = None
        warning: Optional[str] = None
        is_truncated = False

        if ext == ".pdf":
            try:
                doc = fitz.open(resolved_path)
                page_count = len(doc)
                if page_count == 0:
                    return ReadDocumentResponse(
                        path=str(resolved_path),
                        filename=filename,
                        file_type="PDF",
                        page_count=0,
                        character_count=0,
                        content="",
                        is_truncated=False,
                        warning="The PDF contains 0 pages."
                    )

                extracted_pages = []
                for pno in range(page_count):
                    page = doc[pno]
                    p_text = page.get_text("text") or ""
                    extracted_pages.append(p_text.strip())

                doc.close()
                combined_text = "\n\n".join(filter(None, extracted_pages))

                # Check if scanned PDF (no selectable text found despite having pages)
                if not combined_text.strip():
                    is_scanned = True
                    warning = (
                        "This PDF contains images or scanned pages with no extractable text layer. "
                        "OCR (Optical Character Recognition) support would be required to extract text."
                    )
                    text_content = "[Scanned document: No extractable text found in PDF]"
                else:
                    text_content = combined_text

            except Exception as e:
                raise PathSecurityError(f"Failed to read PDF document: {str(e)}")

        elif ext in (".txt", ".md", ".json", ".csv", ".log", ".py", ".ts", ".tsx", ".js", ".html", ".css", ".xml", ".yaml", ".yml"):
            try:
                # Try UTF-8 first, fallback to latin-1
                try:
                    with open(resolved_path, "r", encoding="utf-8") as f:
                        text_content = f.read(settings.MAX_TEXT_EXTRACT_CHARS + 100)
                except UnicodeDecodeError:
                    with open(resolved_path, "r", encoding="latin-1") as f:
                        text_content = f.read(settings.MAX_TEXT_EXTRACT_CHARS + 100)
            except Exception as e:
                raise PathSecurityError(f"Failed to read text file: {str(e)}")
        else:
            raise PathSecurityError(
                f"Unsupported document format: '{ext}'. "
                "Supported formats include .pdf, .txt, .md, .json, .csv, .log, .py, .js, .ts, etc."
            )

        if len(text_content) > settings.MAX_TEXT_EXTRACT_CHARS:
            text_content = text_content[:settings.MAX_TEXT_EXTRACT_CHARS]
            is_truncated = True
            warning = f"Content truncated to {settings.MAX_TEXT_EXTRACT_CHARS:,} characters for safety."

        return ReadDocumentResponse(
            path=str(resolved_path),
            filename=filename,
            file_type=ext.upper().replace(".", ""),
            page_count=page_count,
            character_count=len(text_content),
            content=text_content,
            is_truncated=is_truncated,
            is_scanned_pdf=is_scanned,
            warning=warning
        )

    @staticmethod
    def create_folder(parent_dir: str, folder_name: str, db: Session) -> CreateFolderResponse:
        """
        Safely creates a new folder within an approved parent directory.
        """
        target_path = PathGuard.validate_folder_creation(parent_dir, folder_name, db)

        if target_path.exists():
            return CreateFolderResponse(
                success=False,
                created_path=str(target_path),
                message=f"A directory or file with name '{folder_name}' already exists at this location."
            )

        try:
            target_path.mkdir(parents=False, exist_ok=False)
            return CreateFolderResponse(
                success=True,
                created_path=str(target_path),
                message=f"Folder '{folder_name}' created successfully."
            )
        except OSError as e:
            return CreateFolderResponse(
                success=False,
                created_path=str(target_path),
                message=f"Filesystem error creating folder: {str(e)}"
            )

