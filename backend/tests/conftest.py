import os
import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.models import Base, ApprovedDirectory, RegisteredApp, SettingRecord
from app.config import settings

TEST_DB_PATH = backend_dir / "data" / "test_nexus.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        # Prepopulate test approved directory
        test_dir = backend_dir / "tests" / "test_sandbox"
        test_dir.mkdir(parents=True, exist_ok=True)
        resolved_test_dir = str(test_dir.resolve())

        existing = db.query(ApprovedDirectory).filter_by(path=resolved_test_dir).first()
        if not existing:
            db.add(ApprovedDirectory(path=resolved_test_dir, alias="Test Sandbox", is_default=True))
            db.commit()

        yield db
    finally:
        db.rollback()
        db.close()

