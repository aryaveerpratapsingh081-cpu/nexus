import os
from pathlib import Path
from typing import Optional

class AppSecurityError(Exception):
    """Raised when an application fails security validation or allowlisting."""
    pass

class AppValidator:
    """
    Validates that only legitimate, registered, allowlisted executables
    can be launched. Rejects arbitrary command arguments and destructive utilities.
    """

    # Prohibited system executables that should never be registered or launched as general apps
    BLOCKED_EXECUTABLES = {
        "cmd.exe",
        "powershell.exe",
        "pwsh.exe",
        "regedit.exe",
        "reg.exe",
        "format.com",
        "diskpart.exe",
        "vssadmin.exe",
        "bcdedit.exe",
        "cacls.exe",
        "icacls.exe",
        "takeown.exe",
        "certutil.exe",
        "bitsadmin.exe",
    }

    @classmethod
    def validate_executable_path(cls, exe_path: str) -> Path:
        """
        Validates that the given executable path exists, has a valid executable extension,
        and is not in the blocked list.
        """
        if not exe_path or not exe_path.strip():
            raise AppSecurityError("Executable path cannot be empty.")

        clean_path = exe_path.strip().strip('"').strip("'")
        p = Path(clean_path).resolve()

        # Check if the filename is in the blocked executables list
        filename_lower = p.name.lower()
        if filename_lower in cls.BLOCKED_EXECUTABLES:
            raise AppSecurityError(
                f"Security restriction: Direct launching of '{p.name}' is prohibited "
                "to prevent arbitrary command execution."
            )

        # Must have an executable extension on Windows
        valid_exts = {".exe", ".bat", ".cmd"}
        if p.suffix.lower() not in valid_exts:
            raise AppSecurityError(f"Target file '{p.name}' does not have a supported executable extension ({', '.join(valid_exts)}).")

        if not p.exists():
            raise AppSecurityError(f"Executable not found on system: '{p}'")

        if not p.is_file():
            raise AppSecurityError(f"Path is not a valid file: '{p}'")

        return p

