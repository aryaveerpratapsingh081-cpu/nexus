import os
import pytest
from pathlib import Path
from app.security.validator import AppValidator, AppSecurityError
from app.services.app_service import AppService
from app.schemas.apps import RegisterAppRequest

def test_blocked_executables_rejection():
    # Attempting to register or validate cmd.exe or regedit
    with pytest.raises(AppSecurityError):
        AppValidator.validate_executable_path(r"C:\Windows\System32\cmd.exe")

    with pytest.raises(AppSecurityError):
        AppValidator.validate_executable_path(r"C:\Windows\regedit.exe")

def test_nonexistent_executable_rejection():
    with pytest.raises(AppSecurityError):
        AppValidator.validate_executable_path(r"C:\FakePath\phantom_app.exe")

def test_app_registration_and_list(db_session):
    # Notepad path on Windows
    notepad_path = r"C:\Windows\System32\notepad.exe"
    if Path(notepad_path).exists():
        app = AppService.register_app(
            RegisterAppRequest(
                id="test_notepad",
                name="Test Notepad",
                executable_path=notepad_path,
                category="Utilities"
            ),
            db_session
        )
        assert app.id == "test_notepad"
        assert app.is_available is True

        all_apps = AppService.list_apps(db_session, query="Notepad")
        assert any(a.id == "test_notepad" for a in all_apps)

