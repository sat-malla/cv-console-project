from contextlib import asynccontextmanager

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import frame_source
from cameras import router as cameras_router
from cam_recording import router as recording_router
from ws_routes import regular, canny, motion, yolo, sfm, stereo_vision, logs


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(frame_source.capture_loop())
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(cameras_router)
app.include_router(recording_router)
app.include_router(regular.router)
app.include_router(canny.router)
app.include_router(motion.router)
app.include_router(yolo.router)
app.include_router(sfm.router)
app.include_router(stereo_vision.router)
app.include_router(logs.router)