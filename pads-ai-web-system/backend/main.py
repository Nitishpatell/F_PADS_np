import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from routers import predict, predict_sensor
from services.inference import InferenceService
from services.explanation import ExplanationService
from schemas.prediction import ErrorResponse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables (standard Docker/Production practice)
# In local dev, we assume .env is handled or they are set in the shell
HF_REPO_ID = os.getenv("HF_REPO_ID", "Nitishjp543/PADS")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load Model
    logger.info("Starting up: Loading model...")
    inference_service = InferenceService(repo_id=HF_REPO_ID)
    try:
        inference_service.load_model()
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model at startup: {e}")
    
    # Initialize Explanation Service
    explanation_service = ExplanationService(api_key=GEMINI_API_KEY)
    
    # Attach to app state
    app.state.inference_service = inference_service
    app.state.explanation_service = explanation_service
    
    yield
    # Shutdown logic (none required for now)

app = FastAPI(
    title="PADS AI Web System API",
    description="Backend for Parkinson's Disease classification from smartwatch sensor data.",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api" if os.getenv("VERCEL") else ""
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 10MB Upload Limit Middleware
class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, max_upload_size: int):
        super(LimitUploadSizeMiddleware, self).__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_upload_size:
                return JSONResponse(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={"error": "File too large", "detail": f"Maximum upload size is {self.max_upload_size / (1024*1024):.0f}MB."}
                )
        return await call_next(request)

app.add_middleware(LimitUploadSizeMiddleware, max_upload_size=10 * 1024 * 1024)

# Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Routers
app.include_router(predict.router, tags=["prediction"])
app.include_router(predict_sensor.router, tags=["sensor-prediction"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
