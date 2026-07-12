import asyncio
import time
import cv2
from difflib import SequenceMatcher

from vlm_providers import query_vlm, query_text_model
from sb_logging import log_event
from utils import hue_to_bgr
from models import model, midas, midas_transform
from frame_processors import (
    process_reg, process_canny, process_motion, process_yolo, process_sfm, process_stereo_vision
)

OLLAMA_URL = "http://localhost:11434/api/generate" # Local hosted model for now - the budge holds ://
SAFETY_PROMPT = (
    "Look carefully at this image. Is there an ACTIVE, CONCRETE safety hazard — "
    "such as fire, smoke, a person or object in the way, unusual behaviors, exposed wires? "
    "Do not flag normal household objects like furniture, electronics, or decorations as hazards. "
    "Answer only 'yes' or 'no'."
)
SAFETY_REASON_PROMPT = "In under 10 words, what is the hazard?"
SYNTHESIS_PROMPT = """You are analyzing six simultaneous camera views of the same physical scene, each processed differently with potentially applied filters and settings:

    - Regular: unmodified camera feed
    - Canny: edge detection, shows outlines and shapes
    - Motion: highlights, with a white color, only things that are currently moving.
    - YOLO: object detection with labeled bounding, colored boxes
    - SFM: tracks movement direction of tracked, colored points
    - Depth: shows relative distance, brighter (or darker depending on the settings applied) areas are closer/farther

    Here is what was observed in each view just now:

    Regular: {regular}
    Canny: {canny}
    Motion: {motion}
    YOLO: {yolo}
    SFM: {sfm}
    Depth: {stvis}

Combine these into a single, coherent description of what is actually happening in the scene, in under 50 words. Resolve any contradictions using the most specific view (e.g. trust YOLO for what an object is, trust Motion for whether something is moving)."""

def is_similar(a, b, threshold=0.70):
    if not a or not b:
        return False
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= threshold

async def synthesize_views(descriptions: dict):
    prompt = SYNTHESIS_PROMPT.format(**descriptions)
    return await query_text_model(prompt) 

async def analyze_view_raw(frame) -> str:
    frame_bytes = encode(frame)
    return await describe_and_condense(frame_bytes)

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

        try:
            event = await asyncio.wait_for(event_queue.get(), timeout=1.0) # wait for 1 second
            frame_bytes = event["frame_bytes"]
            safety_result = await check_safety(frame_bytes)
            if safety_result["flagged"]:
                message = safety_result["reason"]
                if message != "urn":
                    await session["summary_queue"].put({
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

                    # moondream analyzes each camera view -> synthesizes with llama3.2
                    descriptions = {
                        "regular": await analyze_view_raw(regular_view),
                        "canny": await analyze_view_raw(canny_view),
                        "motion": await analyze_view_raw(motion_view),
                        "yolo": await analyze_view_raw(yolo_view),
                        "sfm": await analyze_view_raw(sfm_view),
                        "stvis": await analyze_view_raw(stvis_view),
                    }

                    narrative = await synthesize_views(descriptions)

                    last_message = session.get("last_scene_message")
                    if not is_similar(narrative, last_message):
                        await session["summary_queue"].put({
                            "type": "scene",
                            "message": narrative,
                            "timestamp": now,
                        })
                        log_event(session_id=session_id, event_type="scene", message=narrative, flagged=False)
                        session["last_scene_message"] = narrative
                finally:
                    session["agent_thinking"] = False
            last_scene_analysis_time = now


    
