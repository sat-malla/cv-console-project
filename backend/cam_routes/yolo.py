# YOLO26 Object Detection

import asyncio
import json

import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions
from models import model

router = APIRouter()

yolo_config = {"conf_threshold": 0.4, "box_thickness": 2, "max_detections": 20}


@router.websocket("/session/{session_id}/yolo")
async def yolo_feed(websocket: WebSocket, session_id: str):
    if session_id not in sessions:
        await websocket.close(code=4404, reason="Session not found")
        return
    
    await websocket.accept()
    stop = asyncio.Event()
    frame_count = 0

    async def send_frames():
        nonlocal frame_count
        while not stop.is_set():
            session = sessions.get(session_id)
            if session is None:
                stop.set()
                break
            latest_frame = session["latest_frame"]

            frame_count += 1
            if frame_count % 2 == 0:
                await asyncio.sleep(0.033)
                continue

            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue

            try:
                config = session["configs"]["yolo"]
                frame = latest_frame.copy()

                results = model(frame, device="mps", verbose=False)
                boxes = sorted(results[0].boxes, key=lambda b: float(b.conf), reverse=True)
                for box in boxes[:config["max_detections"]]:
                    if box.conf < config["conf_threshold"]:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf)
                    class_name = model.names[int(box.cls)]
                    label = f"{class_name} {conf:.2f}"

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), config["box_thickness"])
                    (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(frame, (x1, y1 - text_h - 6), (x1 + text_w, y1), (0, 255, 0), -1)
                    cv2.putText(frame, label, (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

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
                    session["configs"]["yolo"].update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"YOLO Cam Disconnected: {session_id}")