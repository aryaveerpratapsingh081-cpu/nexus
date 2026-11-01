from app.services.task_service import TaskService

def test_task_persistence_and_retrieval(db_session):
    # Log tasks
    t1 = TaskService.log_task(
        db=db_session,
        user_request="Find my files",
        tool_name="search_files",
        tool_arguments={"query": "test"},
        status="success",
        summary="Found 3 files.",
        duration_ms=45.2
    )
    assert t1.id is not None

    t2 = TaskService.log_task(
        db=db_session,
        user_request="Run bad tool",
        tool_name="unknown",
        status="failed",
        summary="Failed to run.",
        error_details="Invalid tool name"
    )

    # Retrieve all
    history = TaskService.get_tasks(db_session)
    assert history.total >= 2

    # Filter by success
    success_history = TaskService.get_tasks(db_session, status="success")
    assert any(t.id == t1.id for t in success_history.tasks)
    assert not any(t.id == t2.id for t in success_history.tasks)

    # Clear tasks
    clear_res = TaskService.clear_tasks(db_session)
    assert clear_res.deleted_count >= 2

    after_clear = TaskService.get_tasks(db_session)
    assert after_clear.total == 0

