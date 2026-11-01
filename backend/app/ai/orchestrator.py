import json
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.config import settings
from app.database.models import ChatMessageRecord, SettingRecord
from app.ai.prompts import SYSTEM_PROMPT
from app.ai.ollama_client import OllamaClient, OllamaError, OllamaOfflineError, OllamaModelNotFoundError
from app.tools.registry import registry
from app.services.task_service import TaskService
from app.schemas.chat import ChatRequest, ChatResponse, ToolCallLog

class AIOrchestrator:
    @staticmethod
    def get_configured_model_and_endpoint(db: Session) -> tuple[str, str]:
        """Fetch endpoint and model from DB settings, fallback to defaults."""
        endpoint = settings.OLLAMA_HOST
        model = settings.DEFAULT_MODEL

        rec_ep = db.query(SettingRecord).filter_by(key="ollama_endpoint").first()
        if rec_ep and rec_ep.value:
            try:
                endpoint = json.loads(rec_ep.value)
            except Exception:
                pass

        rec_model = db.query(SettingRecord).filter_by(key="selected_model").first()
        if rec_model and rec_model.value:
            try:
                model = json.loads(rec_model.value)
            except Exception:
                pass

        return endpoint, model

    @classmethod
    async def process_chat(cls, req: ChatRequest, db: Session) -> ChatResponse:
        endpoint, default_model = cls.get_configured_model_and_endpoint(db)
        target_model = req.model or default_model

        # 1. Pre-check Ollama status
        status = await OllamaClient.get_status(endpoint=endpoint, selected_model=target_model)
        if not status.is_available:
            return ChatResponse(
                response=(
                    f"### Ollama Service Offline\n\n"
                    f"Nexus AI OS cannot connect to the local Ollama service at `{endpoint}`.\n\n"
                    f"**How to resolve:**\n"
                    f"1. Make sure Ollama is installed.\n"
                    f"2. Launch Ollama from Windows or run `ollama serve` in PowerShell.\n"
                    f"3. Run `ollama pull {target_model}` if you haven't downloaded the model yet.\n\n"
                    f"*You can re-check connection status on the Settings page or the bottom bar.*"
                ),
                thinking=None,
                model_used=target_model,
                tool_executions=[],
                session_id=req.session_id
            )

        if not status.is_selected_model_available:
            return ChatResponse(
                response=(
                    f"### Model Not Found: `{target_model}`\n\n"
                    f"Ollama is running, but the configured model `{target_model}` is not downloaded.\n\n"
                    f"**Installed models detected:** "
                    f"{', '.join([m.name for m in status.models]) if status.models else 'None'}\n\n"
                    f"**To download this model, run in PowerShell:**\n"
                    f"```powershell\nollama pull {target_model}\n```\n"
                    f"Or choose an available model from the **Settings** page."
                ),
                thinking=None,
                model_used=target_model,
                tool_executions=[],
                session_id=req.session_id
            )

        # 2. Build conversation history
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        if req.include_history:
            recent_msgs = (
                db.query(ChatMessageRecord)
                .filter_by(session_id=req.session_id)
                .order_by(desc(ChatMessageRecord.timestamp))
                .limit(8)
                .all()
            )
            recent_msgs.reverse()
            for msg in recent_msgs:
                messages.append({"role": msg.role, "content": msg.content})

        # Append current user prompt
        messages.append({"role": "user", "content": req.message})

        # Save user message to DB
        user_record = ChatMessageRecord(
            session_id=req.session_id,
            role="user",
            content=req.message
        )
        db.add(user_record)
        db.commit()

        # 3. Call Ollama with tools schema
        tools_schema = registry.get_ollama_tools_schema()
        tool_logs: List[ToolCallLog] = []

        try:
            start_time = time.time()
            chat_res = await OllamaClient.chat(
                messages=messages,
                tools=tools_schema,
                model=target_model,
                endpoint=endpoint,
                timeout=60.0
            )
        except (OllamaOfflineError, OllamaModelNotFoundError, OllamaError) as e:
            return ChatResponse(
                response=f"Error communicating with local AI model: {str(e)}",
                thinking=None,
                model_used=target_model,
                tool_executions=[],
                session_id=req.session_id
            )
        except Exception as e:
            return ChatResponse(
                response=f"Unexpected error: {str(e)}",
                thinking=None,
                model_used=target_model,
                tool_executions=[],
                session_id=req.session_id
            )

        message_obj = chat_res.get("message", {})
        assistant_content = message_obj.get("content", "") or ""
        assistant_thinking = message_obj.get("thinking", None)
        ollama_tool_calls = message_obj.get("tool_calls", [])

        # Fallback if no native tool calls but content has JSON tool call
        if not ollama_tool_calls and assistant_content:
            fallback = OllamaClient.extract_fallback_tool_call(assistant_content)
            if fallback:
                t_name, t_args = fallback
                ollama_tool_calls = [{"function": {"name": t_name, "arguments": t_args}}]

        # 4. If tool calls exist, execute each one
        if ollama_tool_calls:
            for tc in ollama_tool_calls:
                func_obj = tc.get("function", {})
                tool_name = func_obj.get("name", "")
                raw_args = func_obj.get("arguments", {})
                if isinstance(raw_args, str):
                    try:
                        raw_args = json.loads(raw_args)
                    except Exception:
                        raw_args = {}

                t_start = time.time()
                tool_result = registry.execute_tool(tool_name, raw_args, db)
                t_duration = (time.time() - t_start) * 1000

                # Log to TaskService (SQLite persistence)
                TaskService.log_task(
                    db=db,
                    user_request=req.message,
                    tool_name=tool_name,
                    tool_arguments=raw_args,
                    status="success" if tool_result.success else "failed",
                    summary=tool_result.summary,
                    error_details=tool_result.error,
                    duration_ms=t_duration
                )

                tool_logs.append(ToolCallLog(
                    tool_name=tool_name,
                    arguments=raw_args,
                    status="success" if tool_result.success else "failed",
                    result=tool_result.data,
                    error=tool_result.error
                ))

            # 5. Synthesize follow-up with tool results
            # Feed tool results back into model to generate a polished final answer
            tool_summary_text = "\n".join([f"- Tool `{l.tool_name}`: {l.status} -> {registry.get_tool(l.tool_name).description if registry.get_tool(l.tool_name) else ''}" for l in tool_logs])
            
            tool_results_prompt = (
                f"The tool execution completed with the following results:\n"
                f"{json.dumps([l.model_dump() for l in tool_logs], indent=2)}\n\n"
                f"Present a helpful, concise summary of the results to the user."
            )

            # Build second-turn prompt
            messages.append({"role": "assistant", "content": assistant_content or "Invoked tools."})
            messages.append({"role": "user", "content": tool_results_prompt})

            try:
                second_res = await OllamaClient.chat(
                    messages=messages,
                    tools=None,
                    model=target_model,
                    endpoint=endpoint,
                    timeout=45.0
                )
                final_content = second_res.get("message", {}).get("content", "")
                if final_content:
                    assistant_content = final_content
                if not assistant_thinking:
                    assistant_thinking = second_res.get("message", {}).get("thinking", None)
            except Exception:
                # If second turn fails, provide tool summary as final response
                assistant_content = f"Tool execution finished.\n\n" + "\n".join([f"**{l.tool_name}**: {l.status.upper()}" for l in tool_logs])

        # If assistant content is still empty
        if not assistant_content.strip() and tool_logs:
            assistant_content = f"Executed {len(tool_logs)} system operation(s) successfully."

        # Save assistant message to DB
        assistant_record = ChatMessageRecord(
            session_id=req.session_id,
            role="assistant",
            content=assistant_content,
            thinking=assistant_thinking,
            tool_calls=json.dumps([l.model_dump() for l in tool_logs]) if tool_logs else None,
            tool_results=None
        )
        db.add(assistant_record)
        db.commit()

        return ChatResponse(
            response=assistant_content,
            thinking=assistant_thinking,
            model_used=target_model,
            tool_executions=tool_logs,
            session_id=req.session_id
        )

