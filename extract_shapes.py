import torch
import os

model_path = "pads-ai-web-system/backend/best_model.pth"
if not os.path.exists(model_path):
    model_path = "best_model.pth"

try:
    print(f"Loading {model_path}...")
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        sd = checkpoint["model_state_dict"]
    else:
        sd = checkpoint
    
    print("\n--- Weight Shapes ---")
    for key in sorted(sd.keys()):
        print(f"{key}: {list(sd[key].shape)}")
        
except Exception as e:
    print(f"ERROR: {e}")
