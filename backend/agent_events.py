import asyncio
import time
import cv2
from difflib import SequenceMatcher

from vlm_providers import query_vlm
from sb_logging import log_event
from utils import hue_to_bgr
from models import model, midas, midas_transform
from frame_processors import (
    process_reg, process_canny, process_motion, process_yolo, process_sfm, process_stereo_vision
)

OLLAMA_URL = "http://localhost:11434/api/generate" # Local hosted model for now - the budge holds ://
SAFETY_PROMPT = "Is there a safety hazard visible in this image? Answer only 'yes' or 'no'."
SAFETY_REASON_PROMPT = "In under 10 words, what is the hazard?"

def is_similar(a, b, threshold=0.70):
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

def encode(frame) -> bytes:
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return buffer.tobytes()

async def analyze_view(session, session_id, view_type, frame):
    frame_bytes = encode(frame)
    condensed = await describe_and_condense(frame_bytes)

    last_message = session["last_scene_messages"].get(view_type)
    if is_similar(condensed, last_message) or condensed == "urn":
        return

    await session["summary_queue"].put({
        "type": f"scene_{view_type}",
        "message": condensed,
        "timestamp": time.time(),
    })
    log_event(session_id=session_id, event_type=f"scene_{view_type}", message=condensed, flagged=False)
    session["last_scene_messages"][view_type] = condensed

async def agent_loop(session_id: str, sessions: dict):
    last_scene_analysis_time = 0
    SCENE_ANALYSIS_INT = 20.0 # seconds

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
                if message != "urn":
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
                    raw_frame = session["latest_frame"].copy()
                    configs = session["configs"]

                    regular_view = process_reg(raw_frame, configs["regular"])
                    canny_view = process_canny(raw_frame, configs["canny"])
                    motion_view = process_motion(raw_frame, configs["motion"], session["fgbg"])
                    yolo_view = process_yolo(raw_frame, configs["yolo"], model)
                    sfm_view, new_gray, new_points = process_sfm(
                        raw_frame, configs["sfm"],
                        session["agent_sfm_prev_gray"], session["agent_sfm_prev_points"],
                        hue_to_bgr
                    )
                    session["agent_sfm_prev_gray"] = new_gray
                    session["agent_sfm_prev_points"] = new_points
                    stvis_view = process_stereo_vision(raw_frame, configs["stvis"], midas, midas_transform)

                    # Analyzing each view independently and sequentially
                    await analyze_view(session, session_id, "regular", regular_view)
                    await analyze_view(session, session_id, "canny", canny_view)
                    await analyze_view(session, session_id, "motion", motion_view)
                    await analyze_view(session, session_id, "yolo", yolo_view)
                    await analyze_view(session, session_id, "sfm", sfm_view)
                    await analyze_view(session, session_id, "stvis", stvis_view)
                finally:
                    session["agent_thinking"] = False
            last_scene_analysis_time = now


    
