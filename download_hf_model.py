from huggingface_hub import hf_hub_download
import os

repo_id = "Nitishjp543/PADS"
filename = "model.py"

try:
    print(f"Downloading {filename} from {repo_id}...")
    downloaded_path = hf_hub_download(repo_id=repo_id, filename=filename)
    print(f"Downloaded to: {downloaded_path}")
    
    with open(downloaded_path, "r") as f:
        content = f.read()
        print("\n--- Downloaded Content (First 20 lines) ---")
        print("\n".join(content.splitlines()[:20]))
        
        # Check for window_layers
        if "window_layers" in content:
            print("\n✅ Found 'window_layers' in downloaded file!")
        else:
            print("\n❌ 'window_layers' NOT found in downloaded file.")
except Exception as e:
    print(f"FAILED to download from HF: {e}")
