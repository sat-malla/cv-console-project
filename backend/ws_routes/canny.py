# Canny edge detection

import asyncio
import json

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions

router = APIRouter()

canny_config = {"threshold1": 100, "threshold2": 200}


@router.websocket("/session/{session_id}/canny")
async def canny_feed(websocket: WebSocket, session_id: str):
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
                config = session["configs"]["canny"]
                frame = latest_frame.copy()
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, config["threshold1"], config["threshold2"])
                edge_density = float(np.count_nonzero(edges)) / edges.size
                session["latest_telemetry"]["canny"] = {"edge_density": round(edge_density, 4)}
                edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
                _, buffer = cv2.imencode('.jpg', edges_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
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
                    session["configs"]["canny"].update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"Canny Cam Disconnected: {session_id}")