from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

class ToolResult(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    summary: str

class BaseTool(ABC):
    name: str
    description: str
    parameters: Dict[str, Any]

    @abstractmethod
    def execute(self, arguments: Dict[str, Any], db: Session) -> ToolResult:
        """Executes the tool with given arguments within safety boundaries."""
        pass

    def to_ollama_tool(self) -> Dict[str, Any]:
        """Converts tool definition to standard Ollama / OpenAI tools format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

