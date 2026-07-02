import base64
import httpx
import asyncio
import time
import cv2

OLLAMA_URL = "http://localhost:11434/api/generate" # Local hosted model for now - the budge holds ://
SAFETY_PROMPT = "Is there a safety hazard visible in this image? Answer only 'yes' or 'no'."
SAFETY_REASON_PROMPT = "In under 10 words, what is the hazard?"

async def query_moondream(frame_bytes: bytes, prompt: str):
    img_b64 = base64.b64encode(frame_bytes).decode("utf-8")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": "moondream",
            "prompt": prompt,
            "images": [img_b64],
            "stream": False,
        })
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    

async def describe_and_condense(frame_bytes: bytes):
    raw_desc = await query_moondream(
        frame_bytes,
        "Describe what you are able to see in this image scene in full detail. List the people, vehicles, objects, and actions visible in this scene."
    )

    condensed = await query_moondream(
        frame_bytes,
        "In two to three short sentences, summarize the most important events that occured in this image scene."
    )


    return condensed

async def check_safety(frame_bytes: bytes):
    response = await query_moondream(
        frame_bytes,
        SAFETY_PROMPT
    )
    danger = response.lower().strip().startswith("yes")

    reason = None
    if danger:
        reason = await query_moondream(frame_bytes, SAFETY_REASON_PROMPT)
    
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
            event_type = event["type"]

            safety_result = await check_safety(frame_bytes)
            if safety_result["flagged"]:
                await summary_queue.put({
                    "type": "safety",
                    "message": safety_result["reason"],
                    "timestamp": time.time()
                })
            
        except asyncio.TimeoutError:
            pass

        now = time.time()
        if now - last_scene_analysis_time >= SCENE_ANALYSIS_INT:
            session = sessions.get(session_id)
            if session and session["latest_frame"] is not None:
                _, buffer = cv2.imencode('.jpg', session["latest_frame"], [cv2.IMWRITE_JPEG_QUALITY, 70])
                frame_bytes = buffer.tobytes()
                description = await describe_and_condense(frame_bytes)
                await session["summary_queue"].put({
                    "type": "scene",
                    "message": description,
                    "timestamp": now,
                })
            last_scene_analysis_time = now


    
