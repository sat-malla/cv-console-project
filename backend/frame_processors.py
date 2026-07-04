import cv2
import numpy as np
import torch

# Processors for ALL SIX CAMERAS (Regular, Canny, MOG2 Motion, YOLO26, SFM, and STVIS)

def process_reg(frame, config):
    frame = frame.copy()
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

    return np.clip(frame, 0, 255).astype("uint8")

def process_canny(frame, config):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, config["threshold1"], config["threshold2"])
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

def process_motion(frame, config, fgbg):
    fgbg.setHistory(config["history"])
    fgbg.setVarThreshold(config["varThreshold"])
    fg_mask = fgbg.apply(frame)
    _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
    fg_mask = cv2.dilate(fg_mask, kernel, iterations=config["dilateIter"])
    return cv2.cvtColor(fg_mask, cv2.COLOR_GRAY2BGR)

def process_yolo(frame, config, model):
    frame = frame.copy()
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
    return frame

def process_sfm(frame, config, prev_gray, prev_points, hue_to_bgr):
    curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    if prev_gray is None or prev_points is None:
        new_points = cv2.goodFeaturesToTrack(
            curr_gray,
            maxCorners=config["maxCorners"],
            qualityLevel=config["qualityLevel"],
            minDistance=config["minDistance"],
            blockSize=7
        )
        return frame, curr_gray, new_points

    prev_points = np.array(prev_points, dtype=np.float32).reshape(-1, 1, 2)
    curr_points, status, _ = cv2.calcOpticalFlowPyrLK(
        prev_gray, curr_gray, prev_points, np.array([]),
        winSize=(15, 15), maxLevel=2,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 10, 0.03)
    )

    annotated = frame.copy()
    new_points = None

    if curr_points is not None and status is not None:
        good_new = curr_points[status == 1]
        good_old = prev_points[status == 1]
        color = hue_to_bgr(config["hue"])

        for new, old in zip(good_new, good_old):
            x_new, y_new = map(int, new.ravel())
            x_old, y_old = map(int, old.ravel())
            dx = int((x_new - x_old) * config["arrowScale"])
            dy = int((y_new - y_old) * config["arrowScale"])
            cv2.arrowedLine(annotated, (x_old, y_old), (x_old + dx, y_old + dy), color, 1, tipLength=0.3)
            cv2.circle(annotated, (x_new, y_new), config["pointSize"], color, -1)

        new_points = good_new.reshape(-1, 1, 2) if len(good_new) > 0 else None

    return annotated, curr_gray, new_points # so camera feed and agent processing are independent

def process_stereo_vision(frame, config, midas, midas_transform):
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    input_batch = midas_transform(img_rgb).to("mps")
    with torch.no_grad():
        prediction = midas(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1), size=img_rgb.shape[:2], mode="bicubic", align_corners=False
        ).squeeze()

    depth_map = prediction.cpu().numpy() * config.get("contrast", 1.0)
    depth_min, depth_max = depth_map.min(), depth_map.max()
    depth_normalized = (255 * (depth_map - depth_min) / (depth_max - depth_min)).astype("uint8")
    if config.get("invert", 0):
        depth_normalized = 255 - depth_normalized
    depth_colored = cv2.applyColorMap(depth_normalized, cv2.COLORMAP_INFERNO)

    blur = int(config.get("smoothing", 0))
    if blur > 0:
        k = blur if blur % 2 == 1 else blur + 1
        depth_colored = cv2.GaussianBlur(depth_colored, (k, k), 0)

    return depth_colored