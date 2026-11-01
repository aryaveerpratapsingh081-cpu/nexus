from app.tools.registry import registry
from app.database.models import ApprovedDirectory

def test_tool_registry_initialization():
    tools = registry.get_all_tools()
    tool_names = [t.name for t in tools]
    assert "search_files" in tool_names
    assert "read_document" in tool_names
    assert "summarize_document" in tool_names
    assert "create_folder" in tool_names
    assert "launch_application" in tool_names
    assert "get_system_stats" in tool_names
    assert "list_applications" in tool_names
    assert "get_task_history" in tool_names

def test_get_system_stats_tool(db_session):
    res = registry.execute_tool("get_system_stats", {}, db_session)
    assert res.success is True
    assert "CPU:" in res.summary
    assert "RAM:" in res.summary

def test_invalid_tool_name(db_session):
    res = registry.execute_tool("nonexistent_tool_123", {}, db_session)
    assert res.success is False
    assert "not registered" in res.error

def test_invalid_tool_arguments_handled_gracefully(db_session):
    # read_document without path
    res = registry.execute_tool("read_document", {}, db_session)
    assert res.success is False
    assert "No file path" in res.summary or "required" in str(res.error)

