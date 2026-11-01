import asyncio
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.tools.base import BaseTool, ToolResult
from app.services.file_service import FileService
from app.services.doc_service import DocService
from app.services.app_service import AppService
from app.services.system_service import SystemService
from app.services.task_service import TaskService
from app.security.path_guard import PathSecurityError, FileSizeExceededError, PathNotFoundError
from app.security.validator import AppSecurityError

# 1. Search Files Tool
class SearchFilesTool(BaseTool):
    name = "search_files"
    description = (
        "Search for files by name and/or extension strictly within user-approved directories. "
        "Returns filename, path, size, and modified date."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Substring or filename to search for"
            },
            "extension": {
                "type": "string",
                "description": "Optional file extension filter, e.g. '.pdf', '.txt', '.png'"
            },
            "directory": {
                "type": "string",
                "description": "Optional approved directory path to narrow search scope"
            }
        },
        "required": ["query"]
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        query = str(arguments.get("query", ""))
        extension = arguments.get("extension")
        directory = arguments.get("directory")
        try:
            res = FileService.search_files(
                query=query,
                extension=extension,
                directory=directory,
                db=db,
                max_results=30
            )
            count = len(res.results)
            summary = f"Found {count} matching file(s) for '{query}' in approved directories."
            return ToolResult(
                success=True,
                data=res.model_dump(),
                summary=summary
            )
        except (PathSecurityError, PathNotFoundError) as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"File search failed security check: {str(e)}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Unexpected error during file search: {str(e)}"
            )

# 2. Read Document Tool
class ReadDocumentTool(BaseTool):
    name = "read_document"
    description = (
        "Reads the text content of a supported text file or PDF strictly within approved directories. "
        "Enforces safe size limits and detects scanned PDFs."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Validated path to the document file"
            }
        },
        "required": ["path"]
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        path = str(arguments.get("path", ""))
        if not path:
            return ToolResult(success=False, error="File path is required.", summary="No file path provided.")

        try:
            res = FileService.read_document(path, db)
            summary = f"Read document '{res.filename}' ({res.character_count:,} characters)."
            if res.is_scanned_pdf:
                summary = f"Scanned PDF detected: '{res.filename}' has no extractable text layer."
            return ToolResult(
                success=True,
                data=res.model_dump(),
                summary=summary
            )
        except (PathSecurityError, FileSizeExceededError, PathNotFoundError) as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Document read failed security check: {str(e)}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Error reading document: {str(e)}"
            )

# 3. Summarize Document Tool
class SummarizeDocumentTool(BaseTool):
    name = "summarize_document"
    description = (
        "Extracts text from a document in an approved directory and generates an executive summary "
        "using the local Ollama AI model."
    )
    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the document file to summarize"
            }
        },
        "required": ["path"]
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        path = str(arguments.get("path", ""))
        if not path:
            return ToolResult(success=False, error="File path is required.", summary="No file path provided.")

        try:
            # Run async summarize in event loop
            loop = asyncio.new_event_loop()
            res = loop.run_until_complete(DocService.summarize_document_async(path, db))
            loop.close()

            summary = f"Generated summary for '{res.filename}' using model {res.model_used}."
            return ToolResult(
                success=True,
                data=res.model_dump(),
                summary=summary
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Failed to summarize document: {str(e)}"
            )

# 4. Create Folder Tool
class CreateFolderTool(BaseTool):
    name = "create_folder"
    description = (
        "Safely creates a new folder inside an approved directory. "
        "Rejects path traversal, slashes, and escapes."
    )
    parameters = {
        "type": "object",
        "properties": {
            "parent_directory": {
                "type": "string",
                "description": "Approved parent directory path"
            },
            "folder_name": {
                "type": "string",
                "description": "Clean name of the folder to create (no slashes or special characters)"
            }
        },
        "required": ["parent_directory", "folder_name"]
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        parent_dir = str(arguments.get("parent_directory", ""))
        folder_name = str(arguments.get("folder_name", ""))

        try:
            res = FileService.create_folder(parent_dir, folder_name, db)
            return ToolResult(
                success=res.success,
                data=res.model_dump(),
                summary=res.message
            )
        except (PathSecurityError, PathNotFoundError) as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Folder creation blocked: {str(e)}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Folder creation failed: {str(e)}"
            )

# 5. Launch Application Tool
class LaunchApplicationTool(BaseTool):
    name = "launch_application"
    description = (
        "Launches an allowlisted Windows application from the registered applications catalog. "
        "Does NOT execute arbitrary commands or scripts."
    )
    parameters = {
        "type": "object",
        "properties": {
            "app_id": {
                "type": "string",
                "description": "Unique identifier of the registered app (e.g. 'notepad', 'calculator', 'vscode')"
            },
            "arguments": {
                "type": "string",
                "description": "Optional argument string (e.g. file path to open in app)"
            }
        },
        "required": ["app_id"]
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        app_id = str(arguments.get("app_id", "")).strip().lower()
        args = arguments.get("arguments")

        try:
            res = AppService.launch_app(app_id, args, db)
            return ToolResult(
                success=res.success,
                data=res.model_dump(),
                summary=res.message
            )
        except AppSecurityError as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Application launch rejected by security policy: {str(e)}"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Failed to launch application: {str(e)}"
            )

# 6. Get System Stats Tool
class GetSystemStatsTool(BaseTool):
    name = "get_system_stats"
    description = (
        "Retrieves real-time system metrics including CPU utilization, RAM usage, and disk space."
    )
    parameters = {
        "type": "object",
        "properties": {},
        "required": []
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        try:
            stats = SystemService.get_system_stats()
            summary = (
                f"System Stats: CPU: {stats.cpu.usage_percent}%, "
                f"RAM: {stats.memory.usage_percent}% ({stats.memory.used_gb} GB / {stats.memory.total_gb} GB used), "
                f"Uptime: {int(stats.uptime_seconds // 3600)}h {int((stats.uptime_seconds % 3600) // 60)}m."
            )
            return ToolResult(
                success=True,
                data=stats.model_dump(),
                summary=summary
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Failed to collect system stats: {str(e)}"
            )

# 7. List Applications Tool
class ListApplicationsTool(BaseTool):
    name = "list_applications"
    description = (
        "Lists applications registered in the safe allowlist, with their IDs and availability status."
    )
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Optional search term to filter applications"
            }
        },
        "required": []
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        query = arguments.get("query")
        try:
            apps = AppService.list_apps(db, query)
            app_names = [f"{a.name} (id: {a.id})" for a in apps]
            summary = f"Allowlisted applications ({len(apps)} total): {', '.join(app_names)}."
            return ToolResult(
                success=True,
                data=[a.model_dump() for a in apps],
                summary=summary
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Failed to list applications: {str(e)}"
            )

# 8. Get Task History Tool
class GetTaskHistoryTool(BaseTool):
    name = "get_task_history"
    description = (
        "Retrieves recent system task history records from SQLite database."
    )
    parameters = {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "Optional status filter ('success', 'failed', 'all')"
            },
            "page": {
                "type": "integer",
                "description": "Page number (defaults to 1)"
            }
        },
        "required": []
    }

    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        status = arguments.get("status")
        page = arguments.get("page", 1)
        try:
            res = TaskService.get_tasks(db, status=status, page=page, page_size=10)
            summary = f"Retrieved {len(res.tasks)} recent task records (total: {res.total})."
            return ToolResult(
                success=True,
                data=res.model_dump(),
                summary=summary
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                summary=f"Failed to fetch task history: {str(e)}"
            )

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_defaults()

    def _register_defaults(self):
        self.register(SearchFilesTool())
        self.register(ReadDocumentTool())
        self.register(SummarizeDocumentTool())
        self.register(CreateFolderTool())
        self.register(LaunchApplicationTool())
        self.register(GetSystemStatsTool())
        self.register(ListApplicationsTool())
        self.register(GetTaskHistoryTool())

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        return list(self._tools.values())

    def get_ollama_tools_schema(self) -> List[Dict[str, Any]]:
        return [tool.to_ollama_tool() for tool in self._tools.values()]

    def execute_tool(self, name: str, arguments: Dict[str, Any], db: Session) -> ToolResult:
        tool = self.get_tool(name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{name}' is not registered in the system tool catalog.",
                summary=f"Unknown tool '{name}' requested."
            )
        return tool.execute(arguments, db)

registry = ToolRegistry()

