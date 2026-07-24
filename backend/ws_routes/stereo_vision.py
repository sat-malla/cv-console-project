# Stereo Vision Depth Tracking with MiDaS

import asyncio
import json

import cv2
import torch
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions
from models import midas, midas_transform

router = APIRouter()

sv_config = {"colormap": 8, "contrast": 1.0, "invert": 0, "smoothing": 0}


@router.websocket("/session/{session_id}/stvis")
async def stereo_vis_feed(websocket: WebSocket, session_id: str):
    if session_id not in sessions:
        await websocket.close(code=4404, reason="Session not found")
        return
    
    await websocket.accept()
    stop = asyncio.Event()

    async def send_frames():
        while not stop.is_set():
            session = sessions.get(session_id)
            if session is None:
                stop.set()
                break
            latest_frame = session["latest_frame"]
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                config = session["configs"]["stvis"]
                frame = latest_frame.copy()
                img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                input_batch = midas_transform(img_rgb).to("mps")
                with torch.no_grad():
                    prediction = midas(input_batch)  # type: ignore
                    prediction = torch.nn.functional.interpolate(
                        prediction.unsqueeze(1),
                        size=img_rgb.shape[:2],
                        mode="bicubic",
                        align_corners=False
                    ).squeeze()

                depth_map = prediction.cpu().numpy()
                session["latest_telemetry"]["stvis"] = {
                    "depth_min": round(float(depth_map.min()), 3),
                    "depth_max": round(float(depth_map.max()), 3),
                    "depth_mean": round(float(depth_map.mean()), 3),
                }
                depth_map = depth_map * config.get("contrast", 1.0)
                depth_min = depth_map.min()
                depth_max = depth_map.max()
                depth_normalized = (255 * (depth_map - depth_min) / (depth_max - depth_min)).astype("uint8")
                if config.get("invert", 0):
                    depth_normalized = 255 - depth_normalized
                depth_colored = cv2.applyColorMap(depth_normalized, cv2.COLORMAP_INFERNO)
                blur = int(config.get("smoothing", 0))
                if blur > 0:
                    k = blur if blur % 2 == 1 else blur + 1
                    depth_colored = cv2.GaussianBlur(depth_colored, (k, k), 0)

                _, buffer = cv2.imencode('.jpg', depth_colored, [cv2.IMWRITE_JPEG_QUALITY, 70])
                await websocket.send_bytes(buffer.tobytes())
            except Exception:
                stop.set()
                break
            await asyncio.sleep(0.033)

    async def recv_config():
        while not stop.is_set():
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                incoming = json.loads(data)
                session = sessions.get(session_id)
                if session:
                    session["configs"]["stvis"].update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"Stereo Vision Cam Disconnected: {session_id}")