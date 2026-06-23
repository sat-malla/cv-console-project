from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse 
from contextlib import asynccontextmanager
import asyncio
import cv2
import json
import numpy as np
import colorsys
import subprocess
import uuid
import os
import json as json
import platform
from typing import Optional
import torch
from torchvision.transforms import transforms

from ultralytics import YOLO

latest_frame = None

# configs
regular_config = {"brightness": 0, "contrast": 1.0, "temperature": 0, "tint": 0, "exposure": 0, "hue": 0}
canny_config = {"threshold1": 100, "threshold2": 200}
motion_config = {"varThreshold": 50, "history": 500, "dilateIter": 2}
yolo_config = {"conf_threshold": 0.4, "box_thickness": 2, "max_detections": 20}
sfm_config = {"maxCorners": 150, "qualityLevel": 0.3, "minDistance": 7, "arrowScale": 1.0, "pointSize": 3, "hue": 0}
sv_config = {"colormap": 8, "contrast": 1.0, "invert": 0, "smoothing": 0}

# models
model = YOLO("yolo26n.pt")
midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
# compatible for M4 GPU
midas.to("mps") # type: ignore 
midas.eval() # type: ignore

midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
midas_transform = midas_transforms.small_transform # type: ignore

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
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Utils
active_camera_index: dict[str, Optional[int]] = {"index": None}
cap_holder: dict[str, Optional[cv2.VideoCapture]] = {"cap": None}

@app.get("/cameras")
async def list_cameras():
    system = platform.system()

    if system == "Darwin": # MacOS
        try:
            result = subprocess.run(["system_profiler", "SPCameraDataType", "-json"],
                capture_output=True, text=True, timeout=5)
            data = json.loads(result.stdout)
            cameras = data.get("SPCameraDataType", [])
            device_list = [{"name": cam.get("_name", "Unknown"), "index": i} for i, cam in enumerate(cameras)]
            return {"cameras": device_list}
        except Exception:
            pass
    
    # Windows/Linux/any MacOS failure fallback
    device_list = []
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            device_list.append({"name": f"Camera {i}", "index": i})
        cap.release()
    return {"cameras": device_list}

@app.post("/select-camera")
async def select_camera(index: int):
    if cap_holder["cap"] is not None:
        cap_holder["cap"].release()
    new_cap = cv2.VideoCapture(index)
    if not new_cap.isOpened():
        return {"success": False, "error": "Couldn't open camera"}
    cap_holder["cap"] = new_cap
    active_camera_index["index"] = index
    return {"success": True, "error": "None"}

@app.post("/disconnect-camera")
async def disconnect_camera():
    if cap_holder["cap"] is not None:
        cap_holder["cap"].release()
    cap_holder["cap"] = None
    active_camera_index["index"] = None
    return {"success": True, "error": "None"}

@app.post("/convert")
async def convert_video(file: UploadFile = File(...), format: str = "mp4"):
    temp_id = str(uuid.uuid4())
    input_path = f"/tmp/{temp_id}.webm"
    output_path = f"/tmp/{temp_id}.{format}"

    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    try:
        if format == "mp4":
            cmd = ["ffmpeg", "-i", input_path, "-c:v", "libx264", "-preset", "fast", output_path]
        elif format == "mov":
            cmd = ["ffmpeg", "-i", input_path, "-c:v", "libx264", "-c:a", "aac", output_path]
        else:
            return {"error": "unsupported format"}

        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        return {"error": f"conversion failed: {e.stderr.decode()}"}
    finally:
        os.remove(input_path)

    return FileResponse(output_path, filename=f"recording.{format}", media_type=f"video/{format}")

def hue_to_bgr(hue): # convert 0-360 to 0-1 for colorsys
    r, g, b = colorsys.hsv_to_rgb(hue / 360.0, 1.0, 1.0)
    return (int(b * 255), int(g * 255), int(r * 255))

async def capture_loop():
    global latest_frame
    cap = cv2.VideoCapture(1)
    loop = asyncio.get_event_loop()
    while True:
        cap = cap_holder["cap"]
        if cap is None:
            latest_frame = None
            await asyncio.sleep(0.1)
            continue
        ret, frame = await loop.run_in_executor(None, cap.read)
        if ret:
            latest_frame = frame
        await asyncio.sleep(0.01)

# Cameras
@app.websocket("/regular")
async def video_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()
    async def send_frames():
        while not stop.is_set():
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = latest_frame.copy()
                # Exposure
                exposure_factor = 1.0 + (regular_config["exposure"] / 100.0)
                frame = frame * exposure_factor

                # Brightness
                frame = frame + regular_config["brightness"]

                # Contrast
                frame = (frame - 128) * regular_config["contrast"] + 128
                frame = np.clip(frame, 0, 255).astype("uint8")

                # Temperature
                temp = regular_config["temperature"]
                if temp != 0:
                    if temp != 0:
                        b, g, r = cv2.split(frame.astype("int32"))
                        r = np.clip(r + temp, 0, 255)
                        b = np.clip(b - temp, 0, 255)
                        frame = cv2.merge([b, g, r]).astype("uint8")
                
                # Tint
                tint = regular_config["tint"]
                if tint != 0:
                    b, g, r = cv2.split(frame.astype("int32"))
                    g = np.clip(g - tint, 0, 255)
                    frame = cv2.merge([b, g, r]).astype("uint8")

                # Hue
                hue = regular_config["hue"]
                if hue != 0:
                    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype("int32")
                    hsv[:, :, 0] = (hsv[:, :, 0] + hue) % 100
                    hsv = np.clip(hsv, 0, 255).astype("uint8")
                    frame = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

                frame = np.clip(frame, 0, 255).astype("uint8")

                if frame.dtype != np.uint8 or len(frame.shape) != 3 or frame.shape[2] != 3:
                    print(f"BAD FRAME: dtype={frame.dtype}, shape={frame.shape}")
                
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if buffer is None or len(buffer) == 0:
                    print("ENCODE FAILED")
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
                regular_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break
    try:
        await asyncio.gather(send_frames(), recv_config())
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
            except Exception:
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
            except Exception:
                stop.set()
                break
    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("MOG2 Cam Disconnected")

@app.websocket("/yolo")
async def yolo_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()
    frame_count = 0
    async def send_frames():
        nonlocal frame_count
        while not stop.is_set():
            frame_count += 1
            if frame_count % 2 == 0:
                await asyncio.sleep(0.033)
                continue
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
                
            try:
                frame = latest_frame.copy()

                # YOLO Inference
                results = model(frame, device="mps", verbose=False)
                boxes = sorted(results[0].boxes, key=lambda b: float(b.conf), reverse=True)
                for box in boxes[:yolo_config["max_detections"]]:
                    if box.conf < yolo_config["conf_threshold"]:
                        continue
                        
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf)
                    class_name = model.names[int(box.cls)]
                    label = f"{class_name} {conf:.2f}"

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), yolo_config["box_thickness"])
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
                yolo_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break
    
    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("YOLO Cam Disconnected")

@app.websocket("/sfm")
async def sfm_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()

    prev_frame = None
    prev_points = None
    frame_count = 0 # num. frames to refresh points

    async def send_frames():
        nonlocal prev_frame, prev_points, frame_count
        while not stop.is_set():
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = latest_frame.copy()
                curr_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                frame_count += 1

                if prev_frame is None or prev_points is None or frame_count % 60 == 0:
                    prev_points = cv2.goodFeaturesToTrack(
                        curr_frame, 
                        maxCorners=sfm_config["maxCorners"], # max feature pts to track
                        qualityLevel=sfm_config["qualityLevel"], # quality of corners
                        minDistance=sfm_config["minDistance"], # min pixel distance between features
                        blockSize=7
                    )
                    prev_frame = curr_frame.copy()
                    await asyncio.sleep(0.033)
                    continue
                
                if prev_points is None or len(prev_points) == 0:
                    await asyncio.sleep(0.033)
                    continue

                prev_points = np.array(prev_points, dtype=np.float32).reshape(-1, 1, 2)
                    
                curr_points, status, _ = cv2.calcOpticalFlowPyrLK( # type: ignore
                    prev_frame,
                    curr_frame,
                    prev_points,
                    np.array([]),
                    winSize=(15, 15),
                    maxLevel=2, # handles fast motion
                    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03)
                )

                if curr_points is not None and status is not None:
                    # Filtering successfully tracked points
                    good_new = curr_points[status == 1]
                    good_old = prev_points[status == 1]
                    color = hue_to_bgr(sfm_config["hue"])

                    # motion vectors
                    for new, old in zip(good_new, good_old):
                        x_new, y_new = map(int, new.ravel())
                        x_old, y_old = map(int, old.ravel())

                        dx = int((x_new - x_old) * sfm_config["arrowScale"])
                        dy = int((y_new - y_old) * sfm_config["arrowScale"])
                        x_end = x_old + dx
                        y_end = y_old + dy

                        # drawing feature point tracking
                        cv2.arrowedLine(frame, (x_old, y_old), (x_end, y_end), color, 1, tipLength=0.3)
                        cv2.circle(frame, (x_new, y_new), sfm_config["pointSize"], color, -1)
                    
                    prev_frame = curr_frame.copy()
                    prev_points = good_new.reshape(-1, 1, 2) if curr_points is not None and status is not None and len(good_new) > 0 else None

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
        print("SFM Cam Disconnected")

@app.websocket("/stvis")
async def stereo_vis_feed(websocket: WebSocket):
    await websocket.accept()
    stop = asyncio.Event()
    async def send_frames():
        while not stop.is_set():
            if latest_frame is None:
                await asyncio.sleep(0.01)
                continue
            try:
                frame = latest_frame.copy()
                img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) # MiDaS takes in RGB
                # MiDaS transforms
                input_batch = midas_transform(img_rgb).to("mps")
                with torch.no_grad():
                    prediction = midas(input_batch) # type: ignore
                    prediction = torch.nn.functional.interpolate(
                        prediction.unsqueeze(1),
                        size=img_rgb.shape[:2],
                        mode="bicubic",
                        align_corners=False
                    ).squeeze()

                depth_map = prediction.cpu().numpy()
                depth_map = depth_map * sv_config.get("contrast", 1.0)
                # normalization
                depth_min = depth_map.min()
                depth_max = depth_map.max()
                depth_normalized = (255 * (depth_map - depth_min) / (depth_max - depth_min)).astype("uint8")
                if sv_config.get("invert", 0):
                    depth_normalized = 255 - depth_normalized
                depth_colored = cv2.applyColorMap(depth_normalized, cv2.COLORMAP_INFERNO)
                blur = int(sv_config.get("smoothing", 0))
                if blur > 0:
                    k = blur if blur % 2 == 1 else blur + 1 # odd kernel size
                    depth_colored = cv2.GaussianBlur(depth_colored, (k, k), 0)


                _, buffer = cv2.imencode('.jpg', depth_colored, [cv2.IMWRITE_JPEG_QUALITY, 70])
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
                sv_config.update(incoming)
            except asyncio.TimeoutError:
                continue
            except Exception:
                stop.set()
                break
    
    try:
        await asyncio.gather(send_frames(), recv_config())
    except WebSocketDisconnect:
        print("Stereo Vision Cam Disconnected")
