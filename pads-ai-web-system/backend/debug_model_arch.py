import sys
import os
import torch
from models.model import HierarchicalTransformer

print("--- sys.path ---")
for p in sys.path:
    print(p)

print("\n--- Model Architecture ---")
model = HierarchicalTransformer()
print(model)

print("\n--- State Dict Keys ---")
for key in model.state_dict().keys():
    print(key)

# Check if best_model.pth matches
model_paths = [
    "best_model.pth",
    "../../huggingface-repo/best_model.pth",
    "../../Final results/checkpoints/best_model.pth"
]

for model_path in model_paths:
    if os.path.exists(model_path):
        print(f"\n--- Loading {model_path} ---")
        try:
            checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                sd = checkpoint["model_state_dict"]
            else:
                sd = checkpoint
            print(f"Checkpoint Keys (Total: {len(sd.keys())}):")
            keys = sorted(list(sd.keys()))
            for k in keys[:10]:
                print(k)
            
            # Check for window_layers specific keys
            has_window_layers = any("window_layers" in k for k in sd.keys())
            print(f"Contains 'window_layers': {has_window_layers}")
            
            # Try loading
            model.load_state_dict(sd, strict=False)
            print("Loaded state dict (strict=False)!")
        except Exception as e:
            print(f"FAILED to load {model_path}: {e}")
    else:
        print(f"\nModel file NOT FOUND at {model_path}")
