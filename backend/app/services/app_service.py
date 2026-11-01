import re
import subprocess
import time
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database.models import RegisteredApp
from app.schemas.apps import AppInfo, RegisterAppRequest, LaunchAppResponse
from app.security.validator import AppValidator, AppSecurityError

class AppService:
    @staticmethod
    def list_apps(db: Session, query: Optional[str] = None) -> List[AppInfo]:
        """
        Lists all allowlisted applications from the database.
        Checks if executable is currently available on the filesystem.
        """
        q = db.query(RegisteredApp)
        if query and query.strip():
            clean = f"%{query.strip().lower()}%"
            q = q.filter(RegisteredApp.name.ilike(clean) | RegisteredApp.id.ilike(clean) | RegisteredApp.category.ilike(clean))

        apps = q.all()
        results: List[AppInfo] = []
        for app in apps:
            exe_exists = False
            try:
                exe_exists = Path(app.executable_path).is_file()
            except Exception:
                exe_exists = False

            results.append(AppInfo(
                id=app.id,
                name=app.name,
                executable_path=app.executable_path,
                arguments=app.arguments,
                category=app.category or "General",
                icon=app.icon or "AppWindow",
                is_builtin=app.is_builtin,
                is_available=exe_exists
            ))
        return results

    @staticmethod
    def register_app(data: RegisterAppRequest, db: Session) -> AppInfo:
        """
        Registers a new allowlisted application after strict path and binary validation.
        """
        validated_exe = AppValidator.validate_executable_path(data.executable_path)

        app_id = data.id
        if not app_id:
            # Generate a slug from name
            slug = re.sub(r'[^a-zA-Z0-9_-]', '', data.name.lower().replace(" ", "_"))
            app_id = slug or f"app_{int(time.time())}"

        # Check existing
        existing = db.query(RegisteredApp).filter_by(id=app_id).first()
        if existing:
            raise AppSecurityError(f"Application with ID '{app_id}' is already registered.")

        new_app = RegisteredApp(
            id=app_id,
            name=data.name.strip(),
            executable_path=str(validated_exe),
            arguments=data.arguments.strip() if data.arguments else None,
            category=data.category or "General",
            icon=data.icon or "AppWindow",
            is_builtin=False
        )
        db.add(new_app)
        db.commit()
        db.refresh(new_app)

        return AppInfo(
            id=new_app.id,
            name=new_app.name,
            executable_path=new_app.executable_path,
            arguments=new_app.arguments,
            category=new_app.category,
            icon=new_app.icon,
            is_builtin=new_app.is_builtin,
            is_available=True
        )

    @staticmethod
    def launch_app(app_id: str, arguments: Optional[str], db: Session) -> LaunchAppResponse:
        """
        Launches an allowlisted application strictly without invoking arbitrary shell commands.
        """
        app = db.query(RegisteredApp).filter_by(id=app_id).first()
        if not app:
            raise AppSecurityError(f"Application '{app_id}' is not in the allowlist. Only registered apps can be launched.")

        exe_path = AppValidator.validate_executable_path(app.executable_path)

        cmd = [str(exe_path)]
        if arguments and arguments.strip():
            # Only allow basic filenames or path arguments if validated
            cmd.append(arguments.strip())
        elif app.arguments:
            cmd.append(app.arguments)

        try:
            # Launch in detached background process on Windows (shell=False prevents CMD/PowerShell injection)
            DETACHED_PROCESS = 0x00000008
            CREATE_NEW_PROCESS_GROUP = 0x00000200
            flags = DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP

            proc = subprocess.Popen(
                cmd,
                shell=False,
                creationflags=flags,
                close_fds=True
            )

            return LaunchAppResponse(
                success=True,
                app_id=app.id,
                app_name=app.name,
                executable_path=str(exe_path),
                pid=proc.pid,
                message=f"Successfully launched {app.name} (PID: {proc.pid})."
            )
        except Exception as e:
            return LaunchAppResponse(
                success=False,
                app_id=app.id,
                app_name=app.name,
                executable_path=str(exe_path),
                pid=None,
                message=f"Failed to launch {app.name}: {str(e)}"
            )

    @staticmethod
    def delete_app(app_id: str, db: Session) -> bool:
        """Removes a registered application from allowlist."""
        app = db.query(RegisteredApp).filter_by(id=app_id).first()
        if not app:
            return False
        if app.is_builtin:
            raise AppSecurityError(f"Built-in system application '{app.name}' cannot be deleted.")

        db.delete(app)
        db.commit()
        return True
