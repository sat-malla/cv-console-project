# MOG2 Motion Detection

import asyncio
import json

import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source

router = APIRouter()

motion_config = {"varThreshold": 50, "history": 500, "dilateIter": 2}

fgbg = cv2.createBackgroundSubtractorMOG2(
    history=100,
    varThreshold=50,
    detectShadows=True
)


@router.websocket("/motion")
async def mog2_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()

    async def send_frames():
        while not stop.is_set():
            if frame_source.latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = frame_source.latest_frame.copy()

                fgbg.setHistory(motion_config["history"])
                fgbg.setVarThreshold(motion_config["varThreshold"])

                fg_mask = fgbg.apply(frame)
                _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
                fg_mask = cv2.dilate(fg_mask, kernel, iterations=motion_config["dilateIter"])
                fg_bgr = cv2.cvtColor(fg_mask, cv2.COLOR_GRAY2BGR)

                _, buffer = cv2.imencode('.jpg', fg_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
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
                motion_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("MOG2 Cam Disconnected")