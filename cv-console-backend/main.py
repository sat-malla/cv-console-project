from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import cv2
import json

latest_frame = None

# configs
canny_config = {"threshold1": 100, "threshold2": 200}
motion_config = {"varThreshold": 50, "history": 500, "dilateIter": 2}

async def capture_loop():
    global latest_frame
    cap = cv2.VideoCapture(1)
    loop = asyncio.get_event_loop()
    while True:
        ret, frame = await loop.run_in_executor(None, cap.read)
        if ret:
            latest_frame = frame
        await asyncio.sleep(0.01)

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(capture_loop())
    yield

fgbg = cv2.createBackgroundSubtractorMOG2(
    history=100, # frames to build background from
    varThreshold=50, # lower sensitivity -> better motion detection
    detectShadows=True # gray shadows
)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.websocket("/regular")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            frame = latest_frame.copy()
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            await websocket.send_bytes(buffer.tobytes())
            await asyncio.sleep(0.033)
    except WebSocketDisconnect:
        print("Regular Cam Disconnected")

@app.websocket("/canny")
async def canny_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()
    async def send_frames():
        while not stop.is_set():
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = latest_frame.copy()
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
            except Exception as e:
                stop.set()
                break
    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("Canny Cam Disconnected")

@app.websocket("/motion")
async def mog2_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()
    async def send_frames():
        while not stop.is_set():
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            
            try:
                frame = latest_frame.copy()

                fgbg.setHistory(motion_config["history"])
                fgbg.setVarThreshold(motion_config["varThreshold"])

                fg_mask = fgbg.apply(frame)
                _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY) # kill gray shadow values
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel) # removing ghost noise
                fg_mask = cv2.dilate(fg_mask, kernel, iterations=motion_config["dilateIter"]) # dilates back to fill in real motion
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
            except Exception as e:
                stop.set()
                break
    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("MOG2 Cam Disconnected")