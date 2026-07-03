from fastapi import APIRouter
from pydantic import BaseModel
import cv2

from sb_logging import get_recent_logs
from vlm_providers import query_vlm, query_vlm_text
from sessions import sessions

router = APIRouter()

@router.get("/session/{session_id}/logs")
async def fetch_logs(session_id: str):
    logs = get_recent_logs(session_id)
    session = sessions.get(session_id)
    is_thinking = session["agent_thinking"] if session else False
    return {"logs": logs, "thinking": is_thinking}

class ChatRequest(BaseModel):
    message: str

@router.post("/session/{session_id}/chat")
async def agent_chat(session_id, req: ChatRequest):
    logs = get_recent_logs(session_id, limit=20)
    log_lines = "\n".join(f"- [{l['type']}] {l['message']}" for l in reversed(logs)) # type: ignore
    decide_live_look = (
        f"Recent observations:\n{log_lines}\n\n"
        f"User question: {req.message}\n\n"
        "Does answering this question require looking at the CURRENT live camera frame, "
        "rather than just the observations above? Answer this question only with 'Yes' or 'No'."
    )
    needs_live_look = (await query_vlm_text(decide_live_look)).lower().strip().startswith("yes")
    if needs_live_look:
        session = sessions.get(session_id)
        if session and session["latest_frame"] is not None:
            _, buffer = cv2.imencode('.jpg', session["latest_frame"], [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()

            live_prompt = f"The user asks: {req.message}\n\nAnswer based on what you see right now."
            answer = await query_vlm(frame_bytes, live_prompt)
            return {"reply": answer, "used_live_frame": True}
    
    prompt = (
        "You are a computer vision camera monitoring assistant, keeping high alert on what you see from the camera view. Here are recent observations from a camera feed:\n\n"
        f"{log_lines}\n\n"
        f"The user asks: {req.message}\n\n"
        "Answer clearly and concisely, based only on the observations above."
    )
    response = await query_vlm_text(prompt)
    return {"reply": response}






