import asyncio
import time
import cv2
from difflib import SequenceMatcher

from vlm_providers import query_vlm
from sb_logging import log_event

OLLAMA_URL = "http://localhost:11434/api/generate" # Local hosted model for now - the budge holds ://
SAFETY_PROMPT = "Is there a safety hazard visible in this image? Answer only 'yes' or 'no'."
SAFETY_REASON_PROMPT = "In under 10 words, what is the hazard?"

def is_similar(a, b, threshold=0.75):
    if not a or not b:
        return False
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= threshold
    

async def describe_and_condense(frame_bytes: bytes):
    raw_desc = await query_vlm(
        frame_bytes,
        "Describe what you are able to see in this image scene in full detail. List the people, vehicles, objects, and actions visible in this scene."
    )

    condensed = await query_vlm(
        frame_bytes,
        f"In two to three short sentences, summarize the most important events that occured in this image scene based on your description: {raw_desc}"
    )

    return condensed

async def check_safety(frame_bytes: bytes):
    response = await query_vlm(
        frame_bytes,
        SAFETY_PROMPT
    )
    danger = response.lower().strip().startswith("yes")

    reason = None
    if danger:
        reason = await query_vlm(frame_bytes, SAFETY_REASON_PROMPT)
    
    return {"flagged": danger, "reason": reason}


async def agent_loop(session_id: str, sessions: dict):
    last_scene_analysis_time = 0
    SCENE_ANALYSIS_INT = 5.0 # seconds

    while session_id in sessions:
        session = sessions[session_id]
        event_queue = session["event_queue"]
        summary_queue = session["summary_queue"]

        try:
            event = await asyncio.wait_for(event_queue.get(), timeout=1.0) # wait for 1 second
            frame_bytes = event["frame_bytes"]

            safety_result = await check_safety(frame_bytes)
            if safety_result["flagged"]:
                message = safety_result["reason"]
                await summary_queue.put({
                    "type": "safety",
                    "message": safety_result["reason"],
                    "timestamp": time.time()
                })
                log_event(
                    session_id=session_id,
                    event_type="safety",
                    message=message,
                    flagged=True
                )
        except asyncio.TimeoutError:
            pass

        now = time.time()
        if now - last_scene_analysis_time >= SCENE_ANALYSIS_INT:
            session = sessions.get(session_id)
            if session and session["latest_frame"] is not None:
                session["agent_thinking"] = True
                try:
                    _, buffer = cv2.imencode('.jpg', session["latest_frame"], [cv2.IMWRITE_JPEG_QUALITY, 70])
                    frame_bytes = buffer.tobytes()
                    description = await describe_and_condense(frame_bytes)
                    last_msg = session.get("last_scene_message")
                    if not is_similar(description, last_msg):
                        await session["summary_queue"].put({
                            "type": "scene",
                            "message": description,
                            "timestamp": now,
                        })
                        log_event(
                            session_id=session_id,
                            event_type="scene",
                            message=description,
                            flagged=False
                        )
                        session["last_scene_message"] = description
                finally:
                    session["agent_thinking"] = False
            last_scene_analysis_time = now


    
