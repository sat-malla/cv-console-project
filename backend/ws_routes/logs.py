from fastapi import APIRouter
from pydantic import BaseModel

from backend.local_storage import get_logs_by_range
from vlm_providers import query_text_model
from sessions import sessions
from query_engine import parse_intent, execute_intent

router = APIRouter()

@router.get("/session/{session_id}/logs")
async def fetch_logs(session_id: str, start=None, end=None):
    logs = get_logs_by_range(session_id, start, end)
    session = sessions.get(session_id)
    is_thinking = session["agent_thinking"] if session else False
    return {"logs": logs, "thinking": is_thinking}

class ChatRequest(BaseModel):
    message: str

DECISION_PROMPT = """Recent observations from a camera:
{log_lines}

User question: {question}

Decide how to answer this question. Respond with exactly one word:
- "logs" if the observations above already contain enough information to answer
- "live" if the question is specifically about the exact current moment and the observations are too old to answer it
- "unknown" if neither the observations nor a live camera check could answer this question (e.g. it asks about motive, history, or something never observed)

Respond with only one word: logs, live, or unknown."""

@router.get("/session/{session_id}/logs")
async def chat_with_agent(session_id: str, req: ChatRequest):
    intent = await parse_intent(req.message)
    rows = execute_intent(session_id, intent)

    if not rows:
        return {
            "reply": "I couldn't find any matching data for that query.",
            "source": "structured_query",
            "row_count": 0,
        }

    rows_text = "\n".join(f"- {row}" for row in rows[:20])

    answer_prompt = (
        f"The user asked: {req.message}\n\n"
        f"Here is the exact data retrieved from the database:\n{rows_text}\n\n"
        "Write a 1-3 sentence natural language answer using these exact numbers/facts. "
        "Do not estimate or guess — only state what's in the data above."
    )
    answer = await query_text_model(answer_prompt)

    return {"reply": answer, "source": "structured_query", "row_count": len(rows)}



