# Nexus AI OS - System Architecture

## 1. Executive Summary

**Nexus AI OS** is an AI-powered desktop environment engineered for Windows. Built for a college-level Computer Science Engineering capstone, it bridges a secure React/TypeScript desktop frontend with a Python FastAPI backend and an entirely local Ollama Large Language Model (`qwen3:4b`).

Unlike cloud-dependent agent wrappers, Nexus AI OS runs 100% locally with zero cloud API keys, enforcing strict defense-in-depth safety boundaries around file operations, process execution, and system monitoring.

---

## 2. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                         NEXUS AI OS DESKTOP                             |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 Electron Secure Host (Chromium)                   |  |
|  |  - contextIsolation: true                                         |  |
|  |  - nodeIntegration: false                                         |  |
|  |  - Restrictive Content Security Policy                            |  |
|  |  - Preload bridge (contextBridge)                                 |  |
|  |                                                                   |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  |            React 19 + TypeScript + Tailwind UI              |  |  |
|  |  |  [Control Center] [AI Assistant] [Smart Files] [Apps]       |  |  |
|  |  |  [System Monitor] [Task History] [Settings]                |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  +-----------------------------------|-------------------------------+  |
+--------------------------------------|----------------------------------+
                                       | HTTP / REST (127.0.0.1:8000)
                                       v
+-------------------------------------------------------------------------+
|                  FASTAPI PYTHON BACKEND (127.0.0.1:8000)                |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                        API Routing Layer                          |  |
|  |  /api/health       /api/system/stats    /api/ollama/status        |  |
|  |  /api/chat         /api/files/*         /api/applications/*       |  |
|  |  /api/tasks        /api/settings/*                                |  |
|  +-----------------------------------|-------------------------------+  |
|                                      |                                  |
|  +-----------------------------------+-------------------------------+  |
|  |                   Security Guard & Path Validator                 |  |
|  |  - PathGuard: Approved directory traversal prevention             |  |
|  |  - AppValidator: Hard-blocks cmd.exe, regedit.exe, shells         |  |
|  |  - File size limits (20 MB cap) & non-executable text reader      |  |
|  +-----------------------------------|-------------------------------+  |
|                                      |                                  |
|  +-----------------------------------+-------------------------------+  |
|  |                         Tool Execution Engine                     |  |
|  |  1. search_files       2. read_document       3. summarize_doc    |  |
|  |  4. create_folder      5. launch_application  6. get_system_stats |  |
|  |  7. list_applications  8. get_task_history                        |  |
|  +-----------------|-----------------|-----------------|-------------+  |
|                    |                 |                 |                |
|                    v                 v                 v                |
|         +--------------------+  +----------+  +--------------------+    |
|         |    Doc Extraction  |  |  psutil  |  |   SQLite Database  |    |
|         | (PyMuPDF / fitz)   |  | (Metrics)|  | (Tasks & Settings) |    |
|         +--------------------+  +----------+  +--------------------+    |
+--------------------------------------|----------------------------------+
                                       | Local HTTP (127.0.0.1:11434)
                                       v
+-------------------------------------------------------------------------+
|                         OLLAMA LOCAL DAEMON                             |
|  - Default Model: qwen3:4b (or llama3.2)                                |
|  - Function calling & Native Tool Invocation                            |
|  - Hardware Accelerated (GPU / CPU)                                     |
+-------------------------------------------------------------------------+
```

---

## 3. Core Component Breakdown

### 3.1 Desktop Container (Electron)
- **Security Posture**: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- **Preload Script**: Uses `contextBridge.exposeInMainWorld` to expose an allowlisted API (`nexusDesktop`) for window minimize/maximize/close and platform detection.
- **Content Security Policy**: Hardens the renderer against unauthorized script injection and remote code execution.

### 3.2 Presentation Layer (React 19, TypeScript, Vite, Tailwind CSS)
- **Theme**: Dark charcoal aesthetic (`#0b0d14`, `#11131c`), restrained violet (`#8b5cf6`) and cyan (`#06b6d4`) accents, modern rounded cards, and responsive desktop layout.
- **Pages**:
  1. **Control Center (Home)**: Natural-language command box, quick action cards, live telemetry widgets (CPU, RAM, Disk), and recent task audit.
  2. **AI Assistant**: Conversational interface with tool execution cards (`ToolExecutionCard`), model reasoning accordion (`ThinkingCard`), and history persistence.
  3. **Smart Files**: Search within permitted directories, extension filters, document reader with PyMuPDF, document summarizer, and safe folder creation.
  4. **Applications Launcher**: Allowlisted Windows software catalog with verified path checks, safe background launch (`shell=False`), and registration modal.
  5. **System Monitor**: Live hardware metrics via `psutil` (CPU usage %, physical & logical cores, RAM used/free, and all mounted Windows drive capacities).
  6. **Task History**: Audit log stored in SQLite with search, status filters (`success`, `failed`), and detail modal.
  7. **Settings**: Ollama endpoint configuration, model selector, approved directory management, and database maintenance.

### 3.3 Backend API (Python, FastAPI, Pydantic, Uvicorn)
- **Binding**: Strictly bound to `127.0.0.1:8000` to prevent unauthorized external network access.
- **Data Validation**: Strict Pydantic models for all inputs, outputs, and tool schemas.
- **Local Origin Enforcement**: CORS middleware restricts origins to local dev/desktop hosts.

### 3.4 Tool Execution Engine & Security Guard
- **`PathGuard`**: Resolves paths and validates that all file searches, reads, and creations reside strictly inside user-approved root directories. Any `..` traversal or access to forbidden system folders (e.g. `C:\Windows`) raises `PathSecurityError` (HTTP 403).
- **`AppValidator`**: Ensures that only allowlisted executables with valid extensions (`.exe`, `.bat`, `.cmd`) can be registered or launched. Hard-blocks dangerous utilities (`cmd.exe`, `powershell.exe`, `regedit.exe`, etc.) to prevent arbitrary shell injection.
- **Process Spawning**: Uses `subprocess.Popen` with `shell=False` and detached process flags on Windows, preventing CMD/PowerShell subshell injection.

### 3.5 AI Orchestration Layer
- **Local Ollama Integration**: Interacts with `http://127.0.0.1:11434/api/chat` and `/api/tags`.
- **Two-Turn Tool Calling Loop**:
  1. User prompt is evaluated against registered tool JSON schemas.
  2. Model emits structured tool calls.
  3. Backend validates arguments, executes tool, and persists audit record into SQLite.
  4. Backend feeds tool output back into model to produce a final contextualized answer.
  5. If Ollama or the selected model is offline, clear troubleshooting guidance is surfaced without crashing.

### 3.6 Storage Layer (SQLite & SQLAlchemy)
- **Database File**: `backend/data/nexus.db`
- **Tables**:
  - `task_records`: Audit log of user requests, tools, status, summaries, durations, and errors.
  - `approved_directories`: Permitted filesystem roots.
  - `registered_apps`: Allowlisted application catalog.
  - `chat_messages`: Multi-turn conversational history.
  - `settings`: Key-value configuration store.

