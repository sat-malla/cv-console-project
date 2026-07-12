from fastapi import APIRouter
from pydantic import BaseModel
import cv2
import supabase

from sb_logging import get_relevant_logs, get_logs_by_range
from vlm_providers import query_vlm, query_vlm_text, query_text_model
from sessions import sessions

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

@router.post("/session/{session_id}/chat")
async def agent_chat(session_id, req: ChatRequest):
    logs = get_relevant_logs(session_id, req.message, limit=20)
    log_lines = "\n".join(f"- [{l['type']}] {l['message']}" for l in reversed(logs)) # type: ignore
    decision = (await query_text_model(
        DECISION_PROMPT.format(log_lines=log_lines, question=req.message)
    )).strip().lower()

    if decision == "live":
        session = sessions.get(session_id)
        if session and session["latest_frame"] is not None:
            _, buffer = cv2.imencode('.jpg', session["latest_frame"], [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()
            live_prompt = (
                f"The user asks: {req.message}\n\n"
                "Answer in a full sentence, based on what you currently see. "
                "Be specific about what you observe."
            )
            answer = await query_vlm(frame_bytes, live_prompt)
            return {"reply": answer, "used_live_frame": True, "source": "live"}

    if decision == "unknown":
        return {
            "reply": "I don't have enough information to answer that. My observations only cover what the cameras can see, not things like intent or history.",
            "used_live_frame": False,
            "source": "unknown",
        }         
    
    prompt = (
        "You are a computer vision camera monitoring assistant, keeping high alert on what you see from the camera view. Here are recent observations from a camera feed:\n\n"
        f"Observations: {log_lines}\n\n"
        f"The user asks: {req.message}\n\n"
        "Write a full explanation in 2-3 sentences. Never answer with just 'yes' or 'no' — "
        "always explain what specifically was observed and why. Begin your answer now:"
    )
    response = await query_text_model(prompt)

    if len(response.strip().split()) <= 3:
        followup_prompt = (
            f"You previously answered '{response}' to the question '{req.message}' "
            f"based on these observations:\n{log_lines}\n\n"
            "Expand this into 2-3 full sentences explaining the specific reasoning."
        )
        answer = await query_text_model(followup_prompt)
    return {"reply": response, "used_live_frame": False, "source": "logs"}






