import json
import platform
import subprocess
from typing import Optional

import cv2
from fastapi import APIRouter

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


@router.post("/select-camera")
async def select_camera(index: int):
    if cap_holder["cap"] is not None:
        cap_holder["cap"].release()
    new_cap = cv2.VideoCapture(index)
    if not new_cap.isOpened():
        return {"success": False, "error": "Couldn't open camera"}
    cap_holder["cap"] = new_cap
    active_camera_index["index"] = index
    return {"success": True, "error": "None"}


@router.post("/disconnect-camera")
async def disconnect_camera():
    if cap_holder["cap"] is not None:
        cap_holder["cap"].release()
    cap_holder["cap"] = None
    active_camera_index["index"] = None
    return {"success": True, "error": "None"}