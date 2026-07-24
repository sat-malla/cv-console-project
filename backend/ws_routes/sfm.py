# Structure from Motion Camera - Feature Point Tracking

import asyncio
import json

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import frame_source
from sessions import sessions
from utils import hue_to_bgr

router = APIRouter()

sfm_config = {"maxCorners": 150, "qualityLevel": 0.3, "minDistance": 7, "arrowScale": 1.0, "pointSize": 3, "hue": 0}


@router.websocket("/session/{session_id}/sfm")
async def sfm_feed(websocket: WebSocket, session_id: str):
    if session_id not in sessions:
        await websocket.close(code=4404, reason="Session not found")
        return

    await websocket.accept()
    stop = asyncio.Event()

    prev_frame = None
    prev_points = None
    frame_count = 0

    async def send_frames():
        nonlocal prev_frame, prev_points, frame_count
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
                config = session["configs"]["sfm"]
                frame = latest_frame.copy()
                curr_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                frame_count += 1

                resolution_changed = prev_frame is not None and prev_frame.shape != curr_frame.shape

                if prev_frame is None or prev_points is None or frame_count % 60 == 0 or resolution_changed:
                    prev_points = cv2.goodFeaturesToTrack(
                        curr_frame,
                        maxCorners=config["maxCorners"],
                        qualityLevel=config["qualityLevel"],
                        minDistance=config["minDistance"],
                        blockSize=7
                    )
                    prev_frame = curr_frame.copy()
                    await asyncio.sleep(0.033)
                    continue

                if prev_points is None or len(prev_points) == 0:
                    await asyncio.sleep(0.033)
                    continue

                prev_points = np.array(prev_points, dtype=np.float32).reshape(-1, 1, 2)

                curr_points, status, _ = cv2.calcOpticalFlowPyrLK(  # type: ignore
                    prev_frame,
                    curr_frame,
                    prev_points,
                    np.array([]),
                    winSize=(15, 15),
                    maxLevel=2,
                    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03)
                )

                if curr_points is not None and status is not None:
                    good_new = curr_points[status == 1]
                    good_old = prev_points[status == 1]
                    color = hue_to_bgr(config["hue"])

                    magnitudes = []
                    for new, old in zip(good_new, good_old):
                        x_new, y_new = map(int, new.ravel())
                        x_old, y_old = map(int, old.ravel())

                        dx = int((x_new - x_old) * config["arrowScale"])
                        dy = int((y_new - y_old) * config["arrowScale"])
                        x_end = x_old + dx
                        y_end = y_old + dy

                        cv2.arrowedLine(frame, (x_old, y_old), (x_end, y_end), color, 1, tipLength=0.3)
                        cv2.circle(frame, (x_new, y_new), config["pointSize"], color, -1)
                        magnitudes.append(float(np.sqrt(dx**2 + dy**2)))
                    
                    session["latest_telemetry"]["sfm"] = {
                        "tracked_point_count": len(good_new),
                        "avg_motion_magnitude": round(float(np.mean(magnitudes)), 3) if magnitudes else 0.0,
                    }
                    
                    prev_frame = curr_frame.copy()
                    prev_points = good_new.reshape(-1, 1, 2) if len(good_new) > 0 else None

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
                sfm_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break

    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print(f"SFM Cam Disconnected: {session_id}")