from backend.local_storage import log_event

log_event(
    session_id="test-session-123",
    event_type="scene",
    message="Test entry — person standing near a desk.",
    flagged=False
)

print("Insert attempted — check your Supabase table.")