import os
from pathlib import Path
from typing import List, Optional, Union
from sqlalchemy.orm import Session
from app.database.models import ApprovedDirectory
from app.config import settings

class PathSecurityError(Exception):
    """Raised when an unauthorized or malicious path operation is attempted."""
    pass

class FileSizeExceededError(Exception):
    """Raised when a file exceeds the configured maximum allowable size."""
    pass

class PathNotFoundError(Exception):
    """Raised when a specified file or directory cannot be found."""
    pass

class PathGuard:
    """
    Security guard that strictly enforces filesystem access policies.
    Guarantees no file reading, searching, or folder creation can happen
    outside administrator/user-approved directories.
    """

    @staticmethod
    def get_approved_directories(db: Session) -> List[Path]:
        """Fetch all approved root directories from the database."""
        records = db.query(ApprovedDirectory).all()
        dirs = []
        for r in records:
            try:
                p = Path(r.path).resolve()
                if p.exists() and p.is_dir():
                    dirs.append(p)
            except Exception:
                continue
        # Fallback to workspace if DB had no entries
        if not dirs:
            fallback = (settings.BASE_DIR / "workspace").resolve()
            fallback.mkdir(parents=True, exist_ok=True)
            dirs.append(fallback)
        return dirs

    @classmethod
    def validate_path_within_approved(
        cls,
        target_path: Union[str, Path],
        db: Session,
        must_exist: bool = True
    ) -> Path:
        """
        Validates that target_path resolves strictly inside one of the approved directories.
        Prevents traversal (e.g. ../../Windows, C:\\Windows, etc.)
        """
        if not target_path:
            raise PathSecurityError("Path cannot be empty.")

        try:
            raw_path = Path(target_path)
            # If path contains null bytes, reject immediately
            if "\x00" in str(target_path):
                raise PathSecurityError("Null bytes in path are forbidden.")

            resolved = raw_path.resolve()
        except Exception as e:
            raise PathSecurityError(f"Invalid path representation: {str(e)}")

        approved_roots = cls.get_approved_directories(db)
        
        is_safe = False
        for root in approved_roots:
            try:
                # In Python 3.9+, is_relative_to checks ancestry safely
                if resolved == root or resolved.is_relative_to(root):
                    is_safe = True
                    break
            except Exception:
                # Fallback check
                try:
                    resolved.relative_to(root)
                    is_safe = True
                    break
                except ValueError:
                    continue

        if not is_safe:
            raise PathSecurityError(
                f"Access denied: '{resolved}' is not within any approved directory. "
                f"Approved locations can be managed in Settings."
            )

        if must_exist and not resolved.exists():
            raise PathNotFoundError(f"Path does not exist: '{resolved}'")

        return resolved

    @classmethod
    def validate_file_for_reading(
        cls,
        file_path: Union[str, Path],
        db: Session,
        max_size_bytes: Optional[int] = None
    ) -> Path:
        """
        Validates that file exists, is inside approved dir, is a regular file,
        and does not exceed maximum allowable file size.
        """
        resolved = cls.validate_path_within_approved(file_path, db, must_exist=True)

        if not resolved.is_file():
            raise PathSecurityError(f"Target path is not a regular file: '{resolved}'")

        max_limit = max_size_bytes or settings.MAX_FILE_SIZE_BYTES
        try:
            size = resolved.stat().st_size
            if size > max_limit:
                raise FileSizeExceededError(
                    f"File size ({size / (1024*1024):.2f} MB) exceeds maximum allowed limit "
                    f"({max_limit / (1024*1024):.2f} MB)."
                )
        except OSError as e:
            raise PathSecurityError(f"Failed to check file properties: {str(e)}")

        return resolved

    @classmethod
    def validate_folder_creation(
        cls,
        parent_dir: Union[str, Path],
        folder_name: str,
        db: Session
    ) -> Path:
        """
        Validates parent directory is approved and folder_name is clean (no path traversal).
        """
        resolved_parent = cls.validate_path_within_approved(parent_dir, db, must_exist=True)
        if not resolved_parent.is_dir():
            raise PathSecurityError(f"Parent path is not a directory: '{resolved_parent}'")

        if not folder_name or not folder_name.strip():
            raise PathSecurityError("Folder name cannot be empty.")

        clean_name = folder_name.strip()

        # Reject path separators, relative jumps, drive letters, reserved names
        illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\x00']
        if any(c in clean_name for c in illegal_chars):
            raise PathSecurityError(f"Folder name contains forbidden characters: {clean_name}")

        if clean_name in (".", "..") or clean_name.startswith(".."):
            raise PathSecurityError("Path traversal elements are forbidden in folder name.")

        new_target = (resolved_parent / clean_name).resolve()
        
        # Verify again that new_target is still within resolved_parent
        try:
            if not new_target.is_relative_to(resolved_parent):
                raise PathSecurityError("Folder creation path escapes approved parent directory.")
        except Exception:
            raise PathSecurityError("Path hierarchy validation failed.")

        return new_target

