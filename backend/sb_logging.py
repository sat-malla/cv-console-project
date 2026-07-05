import os
from dotenv import load_dotenv
from supabase import create_client, Client

from embeddings import embed_text

load_dotenv()

SUPABASE_PROJECT_URL = os.environ.get("SUPABASE_PROJECT_URL")
SUPABASE_API_KEY = os.environ.get("SUPABASE_API_KEY")

supabase: Client = create_client(SUPABASE_PROJECT_URL, SUPABASE_API_KEY) # type: ignore

def get_logs_by_range(session_id: str, start=None, end=None, limit: int = 200):
    query = supabase.table("agent_logs").select("*").eq("session_id", session_id)
    if start:
        query = query.gte("created_at", start)
    if end:
        query = query.lte("created_at", end)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data

def log_event(session_id, event_type, message, flagged=False):
    embedding = embed_text(message) if message else None
    supabase.table("agent_logs").insert({
        "session_id": session_id,
        "type": event_type,
        "message": message,
        "flagged": flagged,
        "embedding": embedding
    }).execute()
    
def get_relevant_logs(session_id, query, limit=20):
    query_embedding = embed_text(query)

    result = supabase.rpc("match_logs", {
        "query_embedding": query_embedding,
        "match_session_id": session_id,
        "match_count": limit
    }).execute()

    return result.data



