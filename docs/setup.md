# Nexus AI OS - Setup and Installation Guide

This guide provides beginner-friendly, step-by-step instructions for installing, configuring, and launching **Nexus AI OS** on Windows.

---

## 1. System Requirements & Prerequisites

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **RAM**: Minimum 8 GB (16 GB recommended for running 4B/8B local models smoothly)
- **Disk Space**: At least 5 GB free disk space
- **Software Dependencies**:
  - **Python**: Version 3.10 to 3.12 (Python 3.12 recommended)
  - **Node.js**: Version 18, 20, or 22+ (npm included)
  - **Ollama for Windows**: Download from [ollama.com](https://ollama.com)

---

## 2. Installing Dependencies

### Step 2.1: Install Ollama & Pull the AI Model
1. Download and run the Windows installer from [https://ollama.com/download/windows](https://ollama.com/download/windows).
2. Once installed, Ollama runs automatically in your system tray on `http://127.0.0.1:11434`.
3. Open PowerShell and pull the recommended default model (`qwen3:4b`):
   ```powershell
   ollama pull qwen3:4b
   ```
   *(Alternative lightweight models: `llama3.2` or `qwen2.5:3b`)*
4. Verify the model is downloaded:
   ```powershell
   ollama list
   ```

### Step 2.2: Setup the Python Backend
1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd D:\Nexus-AI-OS\backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   py -3.12 -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

### Step 2.3: Setup the Frontend Desktop App
1. Open a new PowerShell tab and navigate to `frontend`:
   ```powershell
   cd D:\Nexus-AI-OS\frontend
   ```
2. Install npm dependencies:
   ```powershell
   npm install
   ```
3. Build the production bundle:
   ```powershell
   npm run build
   ```

---

## 3. Running Nexus AI OS

### Option A: One-Click Startup (Recommended)
Double-click `start-nexus.bat` in the project root directory, or run in PowerShell:
```powershell
.\start-nexus.bat
```
This batch script automatically:
1. Starts the FastAPI backend at `http://127.0.0.1:8000`.
2. Starts the Electron desktop environment.

### Option B: Manual Startup

**Terminal 1 (Backend API):**
```powershell
cd D:\Nexus-AI-OS\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Verify the backend is live by opening [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health).

**Terminal 2 (Desktop UI):**
```powershell
cd D:\Nexus-AI-OS\frontend
npm run electron
```
Or for web development with hot-reload:
```powershell
cd D:\Nexus-AI-OS\frontend
npm run electron:dev
```

---

## 4. Troubleshooting Common Issues

### Issue 1: "Ollama Service Offline"
- **Cause**: The Ollama background service is not running.
- **Fix**: Launch Ollama from the Windows Start Menu, or run `ollama serve` in PowerShell.

### Issue 2: "Model Not Found in Ollama"
- **Cause**: The configured model has not been downloaded yet.
- **Fix**: Run `ollama pull qwen3:4b` in PowerShell, or select another available model in the **Settings** page.

### Issue 3: "Access Denied: Path not within approved directory"
- **Cause**: Nexus AI OS prevents unauthorized file access outside permitted roots.
- **Fix**: Go to **Settings > Approved Directories** and add the folder you want to search or read.

### Issue 4: Python execution policy error in PowerShell
- **Fix**: Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` in PowerShell to allow virtual environment scripts to run.

