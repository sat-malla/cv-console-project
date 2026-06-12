from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import cv2

latest_frame = None

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
        print("Disconnected")

@app.websocket("/canny")
async def canny_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
                
            frame = latest_frame.copy()
        
            if len(frame.shape) == 2 or frame.shape[2] == 1:
                gray = frame
            else:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            edges = cv2.Canny(gray, threshold1=100, threshold2=200)
            edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

            _, buffer = cv2.imencode('.jpg', edges_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
            await websocket.send_bytes(buffer.tobytes())
            await asyncio.sleep(0.033)
    except WebSocketDisconnect:
        print("Disconnected")