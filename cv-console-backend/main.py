from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import cv2


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

cap = cv2.VideoCapture(1)

@app.websocket("/video")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()
    try:
        while True:
            ret, frame = await loop.run_in_executor(None, cap.read)
            if not ret:
                break

            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            await websocket.send_bytes(buffer.tobytes())
    except WebSocketDisconnect:
        print("Disconnected")