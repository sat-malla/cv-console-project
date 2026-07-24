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
from hot_path import evaluate_hard_rules, get_rules_to_fire

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

async def handle_cold_path(session_id: str, session: dict, rule: str, telemetry: dict):
    """
    The actual Cold Path: wakes the LLM only because a hard rule tripped.
    """
    raw_frame = session["latest_frame"]
    if raw_frame is None:
        return

    frame_bytes = encode(raw_frame)

    if rule in ("person_detected", "fast_movement"):
        result = await check_safety(frame_bytes)
        message = result["reason"] if result["flagged"] else f"Rule '{rule}' triggered — no hazard confirmed by vision check."
        flagged = result["flagged"]
    else:
        description = await describe_and_condense(frame_bytes)
        message = f"[{rule}] {description}"
        flagged = False

    await session["summary_queue"].put({
        "type": "cold_path",
        "rule": rule,
        "message": message,
        "timestamp": time.time(),
    })
    log_event(session_id=session_id, event_type=f"trigger_{rule}", message=message, flagged=flagged)

async def agent_loop(session_id: str, sessions: dict):
    HOT_PATH_INTERVAL = 1.0 # check telemetry every 1s
    last_hot_check = 0

    while session_id in sessions:
        session = sessions[session_id]
        
        now = time.time()
        if now - last_hot_check >= HOT_PATH_INTERVAL:
            telemetry = session["latest_telemetry"]
            triggered_rules = evaluate_hard_rules(telemetry)
            rules_to_fire = get_rules_to_fire(triggered_rules, session["last_triggered"], now)

            for rule in rules_to_fire:
                asyncio.create_task(handle_cold_path(session_id, session, rule, telemetry))

            last_hot_check = now

        await asyncio.sleep(0.1)
