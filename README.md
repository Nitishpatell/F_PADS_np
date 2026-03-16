# PADS AI | Neural Diagnostic Terminal

> Advanced Parkinson's Disease classification system built with a FastAPI backend and a Next.js React frontend. Utilizing a Hierarchical Transformer architecture for processing smartwatch sensor data (IMU telemetry) to identify Parkinsonian patterns.

## Features

- **AI Diagnostics:** State-of-the-art Hierarchical Transformer model trained on smartwatch telemetry data.
- **Explainable AI:** Integration with Gemini API to provide comprehensive and easy-to-understand explanations of the predictions.
- **Premium User Interface:** Dark mode, technical medical dashboard aesthetic, highlighting IMU telemetry readings and diagnostic insights.
- **Data Ingestion:** Support for both JSON and drag-and-drop file inputs protocols. 
- **Production-Ready Backend:** Upload limit controls, comprehensive exception handling, CORS-enabled FastAPI ecosystem.

---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- HuggingFace access (or locally downloaded weights for model `Nitishjp543/PADS`)

### 2. Backend Setup
Navigate to the backend directory and activate the virtual environment:
```bash
cd pads-ai-web-system/backend
```

*(If you haven't yet, install the dependencies)*
```bash
pip install -r requirements.txt
```

Set up environment variables by copying `.env.example` to `.env` and adding your API Keys:
```bash
# Example .env configuration
HF_REPO_ID="Nitishjp543/PADS"
GEMINI_API_KEY="your-gemini-api-key"
```

Start the FastAPI server:
```bash
.venv\Scripts\python.exe main.py
```
*The backend should now take a few seconds to load the model weights and start running at `http://localhost:8000`.*

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd pads-ai-web-system/frontend
npm.cmd install
```

Start the Next.js development server:
```bash
npm.cmd run dev
```
*The frontend is now available at `http://localhost:3000`.*

---

## Configuration

### Environment Variables (Backend)
| Variable | Description | Default |
|----------|-------------|---------|
| `HF_REPO_ID` | Hugging Face Model Repository ID | `Nitishjp543/PADS` |
| `GEMINI_API_KEY` | Gemini API Key for Explainable AI (XAI) feature | `""` |

---

## Architecture

- **Frontend:** Next.js (React 19), TailwindCSS (Custom dark mode UI), Recharts for graphs, Lucide React for iconography.
- **Backend:** FastAPI, Python 3.10+, PyTorch (Hierarchical Transformers), HuggingFace Hub, Uvicorn.
- **AI Core:** Transformers sequence modelling on continuous IMU telemetry.

---

## Documentation

- **Local Endpoint:** `http://localhost:8000/docs` (Interactive Swagger UI for standard endpoints)

### API Reference 

**POST `/predict`**
Runs model inference on sensor data payload (10MB upload limit).

**Response:**
- `200`: `{"prediction": "...", "confidence": "...", "explanation": "..."}`
- `413`: Payload too large.
- `500`: General Server Error

---

## License
MIT
