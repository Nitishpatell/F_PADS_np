try:
    import torch
    print(f"Torch imported successfully. Version: {torch.__version__}")
    import torch.nn as nn
    print("torch.nn imported successfully.")
except Exception as e:
    import traceback
    print(f"Error importing torch: {type(e).__name__}: {e}")
    traceback.print_exc()
