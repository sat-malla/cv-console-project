import cv2

cap = cv2.VideoCapture(1) # iphone connected thru camo app, NOT iphone continuity
ret, frame = cap.read()
if ret:
    print(f"Camera found at index 1, frame shape: {frame.shape}")
cap.release()