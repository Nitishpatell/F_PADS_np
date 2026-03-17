import os
import sys

# Ensure project root and backend are in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)

backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from backend.main import app
