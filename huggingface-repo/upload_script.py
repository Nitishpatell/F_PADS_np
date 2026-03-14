from huggingface_hub import HfApi
import os

def load_env(file_path):
    """Simple parser to load .env file without external dependencies."""
    env_vars = {}
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

def upload_to_huggingface():
    # Path to the .env file in the backend directory
    env_path = os.path.join("..", "pads-ai-web-system", "backend", ".env")
    env = load_env(env_path)
    
    token = env.get("HF_TOKEN")
    repo_id = env.get("HF_REPO_ID", "Nitishjp543/PADS")

    if not token:
        print("\n❌ Error: HF_TOKEN not found in .env file.")
        print(f"Looked in: {os.path.abspath(env_path)}")
        return

    try:
        api = HfApi()
        
        print(f"Uploading files to Hugging Face repository: {repo_id}...")
        api.upload_folder(
            folder_path=".", 
            repo_id=repo_id,
            repo_type="model",
            token=token,
            ignore_patterns=["upload_script.py"]
        )
        print(f"\n✅ Successfully uploaded folder to https://huggingface.co/models/{repo_id}")
        
    except Exception as e:
        print(f"\n❌ Failed to upload: {e}")

if __name__ == "__main__":
    print("Welcome to the Hugging Face Model Uploader!")
    print("-" * 50)
    upload_to_huggingface()
