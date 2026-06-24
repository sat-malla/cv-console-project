# Regular camera feed

import asyncio
import json

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions

router = APIRouter()

regular_config = {"brightness": 0, "contrast": 1.0, "temperature": 0, "tint": 0, "exposure": 0, "hue": 0}


@router.websocket("/session/{session_id}/regular")
async def video_feed(websocket: WebSocket, session_id: str):
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
                config = session["configs"]["regular"]
                frame = latest_frame.copy()

                exposure_factor = 1.0 + (config["exposure"] / 100.0)
                frame = frame * exposure_factor
                frame = frame + config["brightness"]
                frame = (frame - 128) * config["contrast"] + 128
                frame = np.clip(frame, 0, 255).astype("uint8")

                temp = config["temperature"]
                if temp != 0:
                    b, g, r = cv2.split(frame.astype("int32"))
                    r = np.clip(r + temp, 0, 255)
                    b = np.clip(b - temp, 0, 255)
                    frame = cv2.merge([b, g, r]).astype("uint8")

                tint = config["tint"]
                if tint != 0:
                    b, g, r = cv2.split(frame.astype("int32"))
                    g = np.clip(g - tint, 0, 255)
                    frame = cv2.merge([b, g, r]).astype("uint8")

                hue = config["hue"]
                if hue != 0:
                    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype("int32")
                    hsv[:, :, 0] = (hsv[:, :, 0] + hue) % 180
                    hsv = np.clip(hsv, 0, 255).astype("uint8")
                    frame = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

                frame = np.clip(frame, 0, 255).astype("uint8")

                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
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
                    session["configs"]["regular"].update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"Regular Cam Disconnected: {session_id}")