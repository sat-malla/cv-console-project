import asyncio
import uuid
import cv2

from agent_events import agent_loop


def default_configs():
    return {
        "regular": {"brightness": 0, "contrast": 1.0, "temperature": 0, "tint": 0, "exposure": 0, "hue": 0},
        "canny": {"threshold1": 100, "threshold2": 200},
        "motion": {"varThreshold": 50, "history": 500, "dilateIter": 2},
        "yolo": {"conf_threshold": 0.4, "box_thickness": 2, "max_detections": 20},
        "sfm": {"maxCorners": 150, "qualityLevel": 0.3, "minDistance": 7, "arrowScale": 1.0, "pointSize": 3, "hue": 0},
        "stvis": {"colormap": 8, "contrast": 1.0, "invert": 0, "smoothing": 0},
    }

sessions: dict[str, dict] = {}

async def capture_loop(session_id: str):
    loop = asyncio.get_event_loop()
    while session_id in sessions:
        session = sessions[session_id]
        cap = session["cap"]
        ret, frame = await loop.run_in_executor(None, cap.read)
        if ret:
            session["latest_frame"] = frame
        await asyncio.sleep(0.01)

def create_session(index: int, name: str) -> dict:
    cap = cv2.VideoCapture(index)
    if not cap.isOpened():
        return {"success": False, "error": "Could not open camera"}

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "cap": cap,
        "camera_index": index,
        "camera_name": name,
        "latest_frame": None,
        "configs": default_configs(),
        "fgbg": cv2.createBackgroundSubtractorMOG2(history=100, varThreshold=50, detectShadows=True),
        "sfm_prev_frame": None,
        "sfm_prev_points": None,
        "sfm_frame_count": 0,
        "event_queue": asyncio.Queue(maxsize=10), # perception -> agents
        "summary_queue": asyncio.Queue(maxsize=20), # agents -> WebSocket (UI reads from WS)
        "last_yolo_classes": set(),
        "last_motion_ratio": 0.0,
    }

    asyncio.create_task(capture_loop(session_id))
    asyncio.create_task(agent_loop(session_id, sessions))
    return {"success": True, "session_id": session_id}

def delete_session(session_id: str) -> dict:
    session = sessions.get(session_id)
    if session is None:
        return {"success": False, "error": "Session not found"}
    if session["cap"] is not None:
        session["cap"].release()
    del sessions[session_id]
    return {"success": True}

def list_sessions() -> list[dict]:
    return [
        {"session_id": sid, "camera_index": s["camera_index"], "camera_name": s["camera_name"]}
        for sid, s in sessions.items()
    ]