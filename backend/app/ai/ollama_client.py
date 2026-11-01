import json
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import settings
from app.schemas.settings import OllamaStatusResponse, OllamaModelItem

class OllamaError(Exception):
    """Base exception for Ollama communication issues."""
    pass

class OllamaOfflineError(OllamaError):
    """Raised when the Ollama daemon is unreachable."""
    pass

class OllamaModelNotFoundError(OllamaError):
    """Raised when the requested model is not downloaded in Ollama."""
    pass

class OllamaClient:
    @staticmethod
    async def get_status(endpoint: Optional[str] = None, selected_model: Optional[str] = None) -> OllamaStatusResponse:
        """
        Pings Ollama service, lists installed models, and checks if selected model is ready.
        """
        host = (endpoint or settings.OLLAMA_HOST).rstrip("/")
        target_model = selected_model or settings.DEFAULT_MODEL

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{host}/api/tags")
                if res.status_code != 200:
                    return OllamaStatusResponse(
                        is_available=False,
                        endpoint=host,
                        model_count=0,
                        models=[],
                        default_model=settings.DEFAULT_MODEL,
                        selected_model=target_model,
                        is_selected_model_available=False,
                        error_message=f"Ollama server returned HTTP {res.status_code}",
                        troubleshooting_guide=(
                            "Ollama returned an unexpected status code. "
                            "Verify Ollama is healthy by running 'ollama list' in terminal."
                        )
                    )

                data = res.json()
                raw_models = data.get("models", [])
                parsed_models: List[OllamaModelItem] = []
                is_target_found = False

                for m in raw_models:
                    m_name = m.get("name", "")
                    size_b = m.get("size", 0)
                    size_fmt = f"{size_b / (1024**3):.2f} GB" if size_b else "Unknown"

                    parsed_models.append(OllamaModelItem(
                        name=m_name,
                        size_bytes=size_b,
                        size_formatted=size_fmt,
                        modified_at=m.get("modified_at"),
                        details=m.get("details")
                    ))

                    if m_name == target_model or m_name.startswith(f"{target_model}:") or target_model.startswith(f"{m_name}:"):
                        is_target_found = True

                troubleshoot = None
                if not is_target_found:
                    troubleshoot = (
                        f"Selected model '{target_model}' is not found in local Ollama storage. "
                        f"Run 'ollama pull {target_model}' in PowerShell or select one of the available models."
                    )

                return OllamaStatusResponse(
                    is_available=True,
                    endpoint=host,
                    model_count=len(parsed_models),
                    models=parsed_models,
                    default_model=settings.DEFAULT_MODEL,
                    selected_model=target_model,
                    is_selected_model_available=is_target_found,
                    error_message=None if is_target_found else f"Model '{target_model}' not installed",
                    troubleshooting_guide=troubleshoot
                )

        except (httpx.ConnectError, httpx.TimeoutException):
            return OllamaStatusResponse(
                is_available=False,
                endpoint=host,
                model_count=0,
                models=[],
                default_model=settings.DEFAULT_MODEL,
                selected_model=target_model,
                is_selected_model_available=False,
                error_message=f"Cannot connect to Ollama at {host}",
                troubleshooting_guide=(
                    "1. Ensure Ollama is installed on your Windows PC (https://ollama.com).\n"
                    "2. Start Ollama from the Windows Start menu or run 'ollama serve' in PowerShell.\n"
                    f"3. Run 'ollama pull {target_model}' to download the default model."
                )
            )
        except Exception as e:
            return OllamaStatusResponse(
                is_available=False,
                endpoint=host,
                model_count=0,
                models=[],
                default_model=settings.DEFAULT_MODEL,
                selected_model=target_model,
                is_selected_model_available=False,
                error_message=str(e),
                troubleshooting_guide="Check your local network configuration and firewall rules."
            )

    @classmethod
    async def chat(
        cls,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        endpoint: Optional[str] = None,
        timeout: float = 60.0
    ) -> Dict[str, Any]:
        """
        Sends chat request to Ollama with tool schema support.
        """
        host = (endpoint or settings.OLLAMA_HOST).rstrip("/")
        target_model = model or settings.DEFAULT_MODEL

        payload = {
            "model": target_model,
            "messages": messages,
            "stream": False
        }
        if tools:
            payload["tools"] = tools

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(f"{host}/api/chat", json=payload)
                
                if res.status_code == 404:
                    raise OllamaModelNotFoundError(
                        f"Model '{target_model}' not found in Ollama. "
                        f"Please pull it using: ollama pull {target_model}"
                    )
                if res.status_code != 200:
                    raise OllamaError(f"Ollama returned HTTP error {res.status_code}: {res.text}")

                return res.json()

        except httpx.ConnectError:
            raise OllamaOfflineError(
                f"Ollama is offline or unreachable at {host}. "
                "Please verify the Ollama service is running."
            )
        except httpx.TimeoutException:
            raise OllamaError(f"Request to Ollama timed out after {timeout} seconds.")

    @staticmethod
    def extract_fallback_tool_call(content: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """
        Fallback parser if the model generated a JSON block describing a tool call in text
        rather than using native function calling payload.
        """
        if not content:
            return None

        # Look for ```json ... ``` blocks containing "tool" or "name"
        pattern = r"```(?:json)?\s*(\{[\s\S]*?\})\s*```"
        matches = re.findall(pattern, content)
        for m in matches:
            try:
                data = json.loads(m)
                tool_name = data.get("tool") or data.get("name") or data.get("function")
                params = data.get("arguments") or data.get("parameters") or {}
                if tool_name and isinstance(params, dict):
                    return (str(tool_name), params)
            except Exception:
                continue

        return None

