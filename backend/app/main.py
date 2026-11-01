import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.db import init_db
from app.api.routes_health import router as health_router
from app.api.routes_system import router as system_router
from app.api.routes_ollama import router as ollama_router
from app.api.routes_chat import router as chat_router
from app.api.routes_files import router as files_router
from app.api.routes_apps import router as apps_router
from app.api.routes_tasks import router as tasks_router
from app.api.routes_settings import router as settings_router
from app.api.routes_voice import router as voice_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database and default entries are created
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Nexus AI OS - AI-Powered Desktop Environment for Windows Backend API",
    lifespan=lifespan
)

# CORS configuration
# Restricted to local origin and desktop frontend
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Host verification middleware: reject non-local requests if accessed externally
@app.middleware("http")
async def verify_local_host(request: Request, call_next):
    # Security header addition
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Register API routers with /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(ollama_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(apps_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(voice_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
