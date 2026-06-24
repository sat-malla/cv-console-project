# Canny edge detection

import asyncio
import json

import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source

router = APIRouter()

canny_config = {"threshold1": 100, "threshold2": 200}


@router.websocket("/canny")
async def canny_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()

    async def send_frames():
        while not stop.is_set():
            if frame_source.latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = frame_source.latest_frame.copy()
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, canny_config["threshold1"], canny_config["threshold2"])
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
                canny_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("Canny Cam Disconnected")