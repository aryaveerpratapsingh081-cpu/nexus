import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.db import get_db
from app.database.models import ChatMessageRecord
from app.ai.orchestrator import AIOrchestrator
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
async def post_chat_message(req: ChatRequest, db: Session = Depends(get_db)):
    return await AIOrchestrator.process_chat(req, db)

@router.get("/messages")
def get_chat_messages(session_id: str = "default", limit: int = 50, db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessageRecord)
        .filter_by(session_id=session_id)
        .order_by(desc(ChatMessageRecord.timestamp))
        .limit(limit)
        .all()
    )
    msgs.reverse()
    
    result = []
    for m in msgs:
        tool_calls = None
        if m.tool_calls:
            try:
                tool_calls = json.loads(m.tool_calls)
            except Exception:
                tool_calls = None

        result.append({
            "id": m.id,
            "session_id": m.session_id,
            "role": m.role,
            "content": m.content,
            "thinking": m.thinking,
            "tool_calls": tool_calls,
            "timestamp": m.timestamp.isoformat()
        })
    return {"messages": result}

@router.delete("/messages")
def clear_chat_messages(session_id: str = "default", db: Session = Depends(get_db)):
    count = db.query(ChatMessageRecord).filter_by(session_id=session_id).delete()
    db.commit()
    return {"message": f"Cleared {count} messages for session '{session_id}'."}

