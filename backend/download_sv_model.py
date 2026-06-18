import torch

model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small") # MiDaS small model -> ~/.cache/torch/hub
print("Download successful")