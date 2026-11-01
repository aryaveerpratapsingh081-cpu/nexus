# Nexus AI OS
> **AI-Powered Desktop Environment for Windows with Kashish Voice Assistant**  
> *A Computer Science Engineering Capstone Project*

Nexus AI OS is a desktop application for Windows that allows users to interact with their computer through natural-language commands and voice interactions. Built using React, TypeScript, Electron, Python FastAPI, and an entirely local Ollama Large Language Model (`qwen3:4b`), it provides real system integrations, safe tool execution, persistent storage, hardware telemetry, and an offline voice assistant named **Kashish** without requiring any paid cloud APIs.

---

## Key Features

1. **Local AI Engine**: Powered by local Ollama (`qwen3:4b` or `llama3.2`). Completely private, on-device inference with zero external cloud subscriptions.
2. **Kashish — Two-Way AI Voice Assistant**:
   - **Local Speech Recognition (STT)**: Powered by `Faster-Whisper` (`tiny.en` int8 on CPU) for sub-second, accurate offline speech-to-text.
   - **Offline Neural Voice (TTS)**: Natural voice synthesis using Windows OneCore / SAPI5 (`Microsoft Zira Desktop`) generated locally into high-fidelity WAV audio.
   - **Interactive Voice Stage**: Beautiful animated purple & cyan glowing orb with Web Audio API frequency analysis, clear state indicators (`IDLE`, `LISTENING`, `TRANSCRIBING`, `THINKING`, `SPEAKING`), push-to-talk, mute controls, and speech replay.
   - **Conversational Intelligence**: Friendly, warm persona named Kashish that executes real system actions (e.g. system monitoring, app launching, file search) and reports actual execution results.
3. **Natural-Language Command Center**: Control your desktop, search files, read documents, launch software, and query telemetry using plain English prompts.
4. **Structured Tool Registry & Safety Guard**:
   - `search_files`: Bounded searches restricted to approved root directories.
   - `read_document`: PyMuPDF-based text and PDF extractor with scanned PDF detection and file-size caps.
   - `summarize_document`: Executive summary generator powered by local LLM chunking.
   - `create_folder`: Safe folder creation with path traversal prevention.
   - `launch_application`: Allowlist-only process launcher with strict binary validation.
   - `get_system_stats`: Live CPU utilization, core frequencies, RAM metrics, and disk capacities via `psutil`.
   - `list_applications`: Allowlisted software catalog.
   - `get_task_history`: Task history retrieval from SQLite.
5. **Security & Isolation**:
   - Path normalization via `PathGuard` prevents `../` directory escapes.
   - Dangerous system executables (`cmd.exe`, `powershell.exe`, `regedit.exe`) are hard-blocked to eliminate prompt injection risks.
   - Secure Electron container with `contextIsolation: true`, `nodeIntegration: false`, and strict Content Security Policy.
6. **Persistent SQLite Auditing**: All user commands, tool executions, durations, and summaries are persistently recorded in SQLite.
7. **Dark Charcoal Desktop UI**: Restrained violet and cyan accents, real-time hardware telemetry, responsive desktop layout, and clean typography.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | Electron, secure preload script (`contextBridge`), allowlisted IPC |
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS, Lucide icons |
| **Backend API** | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| **Local AI Runtime** | Ollama local API (`qwen3:4b` default), streaming & tool execution |
| **Voice Subsystem** | Faster-Whisper (`tiny.en` CPU int8), pyttsx3 (SAPI5/OneCore Zira) |
| **Document Engine** | PyMuPDF (fitz) |
| **System Telemetry** | psutil |
| **Storage Layer** | SQLite, SQLAlchemy |
| **Testing** | Pytest, Pytest-asyncio, FastAPI TestClient (23 automated tests) |

---

## Prerequisites

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **RAM**: Minimum 8 GB (16 GB recommended for smooth 4B model inference and voice)
- **Python**: Version 3.10, 3.11, or 3.12
- **Node.js**: Version 18, 20, or 22+
- **Ollama**: Download from [ollama.com](https://ollama.com)

---

## Quick Start (One-Click)

1. Ensure Ollama is installed and running (`ollama pull qwen3:4b`).
2. Run `.\start-nexus.bat` in PowerShell from the project root.
3. The launcher will automatically start the FastAPI backend on `http://127.0.0.1:8005` and launch the Nexus AI OS desktop window!

---

## Manual Installation & Setup

### 1. Start Ollama and Pull the Model
```powershell
# In PowerShell:
ollama pull qwen3:4b
```

### 2. Install Backend Dependencies
```powershell
cd D:\Nexus-AI-OS\backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies & Build
```powershell
cd D:\Nexus-AI-OS\frontend
npm install
npm run build
```

### 4. Run the Backend Service
```powershell
cd D:\Nexus-AI-OS\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8005 --reload
```
Verify the backend is healthy at: [http://127.0.0.1:8005/api/health](http://127.0.0.1:8005/api/health)

### 5. Launch the Electron Desktop Application
```powershell
cd D:\Nexus-AI-OS\frontend
npm run electron
```

---

## Running Automated Tests

A comprehensive test suite covering health, security boundaries, path traversal, PDF extraction, application allowlisting, tool execution, voice STT/TTS pipeline, and SQLite auditing is provided.

To execute the test suite:
```powershell
.\backend\venv\Scripts\pytest.exe backend\tests -v
```

### Actual Test Results:
```text
============================= test session starts =============================
platform win32 -- Python 3.12.5, pytest-9.2.0, pluggy-1.7.0
rootdir: D:\Nexus-AI-OS

backend/tests/test_apps.py::test_blocked_executables_rejection PASSED    [  4%]
backend/tests/test_apps.py::test_nonexistent_executable_rejection PASSED [  8%]
backend/tests/test_apps.py::test_app_registration_and_list PASSED        [ 13%]
backend/tests/test_health.py::test_backend_health PASSED                 [ 17%]
backend/tests/test_ollama.py::test_ollama_unavailable_state PASSED       [ 21%]
backend/tests/test_ollama.py::test_model_unavailable_state PASSED        [ 26%]
backend/tests/test_security_and_files.py::test_path_traversal_rejection PASSED [ 30%]
backend/tests/test_security_and_files.py::test_unauthorized_directory_rejection PASSED [ 34%]
backend/tests/test_security_and_files.py::test_folder_creation_security PASSED [ 39%]
backend/tests/test_security_and_files.py::test_file_search_and_reading PASSED [ 43%]
backend/tests/test_security_and_files.py::test_pdf_creation_and_extraction PASSED [ 47%]
backend/tests/test_system.py::test_system_stats_service PASSED           [ 52%]
backend/tests/test_system.py::test_system_stats_endpoint PASSED          [ 56%]
backend/tests/test_tasks.py::test_task_persistence_and_retrieval PASSED  [ 60%]
backend/tests/test_tools.py::test_tool_registry_initialization PASSED    [ 65%]
backend/tests/test_tools.py::test_get_system_stats_tool PASSED           [ 69%]
backend/tests/test_tools.py::test_invalid_tool_name PASSED               [ 73%]
backend/tests/test_tools.py::test_invalid_tool_arguments_handled_gracefully PASSED [ 78%]
backend/tests/test_voice.py::test_voice_status_endpoint PASSED           [ 82%]
backend/tests/test_voice.py::test_voice_speak_endpoint PASSED            [ 86%]
backend/tests/test_voice.py::test_voice_transcribe_missing_file PASSED   [ 91%]
backend/tests/test_voice.py::test_voice_transcribe_valid_file PASSED     [ 95%]
backend/tests/test_voice.py::test_voice_stop_playback PASSED             [100%]

======================== 23 passed, 1 warning in 5.09s ========================
```

---

## Project Structure

```
d:\Nexus-AI-OS\
├── backend\
│   ├── app\
│   │   ├── api\                  # API endpoints (health, system, ollama, chat, files, apps, tasks, settings, voice)
│   │   ├── ai\                   # Ollama client, AI orchestrator, prompts (Kashish persona)
│   │   ├── tools\                # Tool registry (8 safe tools with Pydantic validation)
│   │   ├── services\             # FileService, DocService, AppService, SystemService, TaskService, VoiceService
│   │   ├── database\             # SQLite engine, models (Base, TaskRecord, RegisteredApp, etc.)
│   │   ├── schemas\              # Pydantic request/response schemas (including voice schemas)
│   │   ├── security\             # PathGuard (traversal checks) & AppValidator (binary allowlisting)
│   │   ├── config.py             # App settings & environment overrides
│   │   └── main.py               # FastAPI entrypoint, lifespan startup, CORS
│   ├── data\                     # Local storage (.gitkeep, nexus.db excluded)
│   ├── tests\                    # 23 unit, security, and voice test cases
│   └── requirements.txt          # Python dependencies
├── frontend\
│   ├── electron\
│   │   ├── main.cjs              # Secure Electron main process (microphone permissions & media CSP)
│   │   └── preload.cjs           # contextBridge allowlisted IPC
│   ├── src\
│   │   ├── components\           # Layout (Header, Sidebar), Common cards/modals, Chat cards
│   │   ├── pages\                # Views: Home, Kashish Voice, Assistant, Files, Apps, System, Tasks, Settings
│   │   ├── services\             # api.ts (backend client & voice endpoints)
│   │   └── types\                # TypeScript interface declarations
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── workspace\                    # Default safe sandbox directory with sample files
├── docs\
│   ├── architecture.md           # Deep architectural diagrams and component docs
│   ├── setup.md                  # Comprehensive setup walkthrough
│   └── testing.md                # Test execution logs and verification reports
├── start-nexus.bat               # Windows 1-click launcher
├── start-backend.bat             # Modular backend runner
├── start-frontend.bat            # Modular frontend desktop runner
└── README.md
```

---

## Security Model

Nexus AI OS adheres to strict defense-in-depth principles:
- **No Arbitrary Shell**: The model cannot invoke raw PowerShell, CMD, or bash commands.
- **Path Traversal Protection**: All paths are resolved and strictly validated against allowlisted roots (`Path.is_relative_to()`). Relative paths containing `..` or illegal characters are rejected with HTTP 403.
- **Application Allowlisting**: Only executables registered in the SQLite catalog can be launched. Blocked system utilities (`cmd.exe`, `powershell.exe`, `regedit.exe`, etc.) are prohibited.
- **Non-destructive Initial Version**: Arbitrary file deletion, software installations, and registry modifications are disallowed.
- **Electron Security**: `nodeIntegration` is disabled, `contextIsolation` is enabled, and a strict Content Security Policy blocks unauthorized external scripts.

---

## License

Developed as an academic Computer Science Engineering project. Licensed under the MIT License.
