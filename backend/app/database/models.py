from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class TaskRecord(Base):
    __tablename__ = "task_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_request = Column(Text, nullable=False)
    tool_name = Column(String(100), nullable=True)
    tool_arguments = Column(Text, nullable=True)  # JSON string
    status = Column(String(50), default="pending", index=True)  # success, failed, rejected
    summary = Column(Text, nullable=False)
    error_details = Column(Text, nullable=True)
    duration_ms = Column(Float, nullable=True)

class ApprovedDirectory(Base):
    __tablename__ = "approved_directories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    path = Column(String(1000), unique=True, nullable=False)
    alias = Column(String(200), nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RegisteredApp(Base):
    __tablename__ = "registered_apps"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    executable_path = Column(String(1000), nullable=False)
    arguments = Column(String(500), nullable=True)
    category = Column(String(100), default="General")
    icon = Column(String(100), default="AppWindow")
    is_builtin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SettingRecord(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)  # JSON encoded value

class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), default="default", index=True)
    role = Column(String(50), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    thinking = Column(Text, nullable=True)
    tool_calls = Column(Text, nullable=True)   # JSON string
    tool_results = Column(Text, nullable=True) # JSON string
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

