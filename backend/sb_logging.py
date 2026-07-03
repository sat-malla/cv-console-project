import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_PROJECT_URL = os.environ.get("SUPABASE_PROJECT_URL")
SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")

supabase: Client = create_client(SUPABASE_PROJECT_URL, SUPABASE_API_KEY) # type: ignore

def log_event(session_id, event_type, message, flagged=False):
    supabase.table("agent_logs").insert({
        "session_id": session_id,
        "type": event_type,
        "message": message,
        "flagged": flagged,
    }).execute()
    
def get_recent_logs(session_id, limit=50):
    result = (
        supabase.table("agent_logs")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data



