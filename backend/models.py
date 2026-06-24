import torch
from torchvision.transforms import transforms
from ultralytics import YOLO

# YOLO26
model = YOLO("yolo26n.pt")

# MiDaS
midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
midas.to("mps")  # type: ignore
midas.eval()  # type: ignore

midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
midas_transform = midas_transforms.small_transform  # type: ignore