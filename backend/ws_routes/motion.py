# MOG2 Motion Detection

import asyncio
import json

import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions

router = APIRouter()

motion_config = {"varThreshold": 50, "history": 500, "dilateIter": 2}

fgbg = cv2.createBackgroundSubtractorMOG2(
    history=100,
    varThreshold=50,
    detectShadows=True
)


@router.websocket("/session/{session_id}/motion")
async def mog2_feed(websocket: WebSocket, session_id: str):
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
                config = session["configs"]["motion"]
                frame = latest_frame.copy()

                fgbg.setHistory(config["history"])
                fgbg.setVarThreshold(config["varThreshold"])

                fg_mask = fgbg.apply(frame)
                _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
                fg_mask = cv2.dilate(fg_mask, kernel, iterations=config["dilateIter"])
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
                session = sessions.get(session_id)
                if session:
                    session["configs"]["motion"].update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"MOG2 Cam Disconnected: {session_id}")