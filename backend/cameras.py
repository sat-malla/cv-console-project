import json
import platform
import subprocess
from typing import Optional

import cv2
from fastapi import APIRouter

import sessions as sess_module

router = APIRouter()

active_camera_index: dict[str, Optional[int]] = {"index": None}
cap_holder: dict[str, Optional[cv2.VideoCapture]] = {"cap": None}


@router.get("/cameras")
async def list_cameras():
    system = platform.system()

    if system == "Darwin":  # macOS
        try:
            result = subprocess.run(
                ["system_profiler", "SPCameraDataType", "-json"],
                capture_output=True, text=True, timeout=5
            )
            data = json.loads(result.stdout)
            cameras = data.get("SPCameraDataType", [])
            device_list = [{"name": cam.get("_name", "Unknown"), "index": i} for i, cam in enumerate(cameras)]
            return {"cameras": device_list}
        except Exception:
            pass

    # Windows/Linux/any macOS failure fallback
    device_list = []
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            device_list.append({"name": f"Camera {i}", "index": i})
        cap.release()
    return {"cameras": device_list}

@router.post("/sessions")
async def create_sess(index: int, name: str="Camera"):
    return sess_module.create_session(index, name)

@router.delete("/sessions/{session_id}")
async def delete_sess(session_id: str):
    return sess_module.delete_session(session_id)

@router.get("/sessions")
async def list_sess():
    return {"sessions": sess_module.list_sessions()}




