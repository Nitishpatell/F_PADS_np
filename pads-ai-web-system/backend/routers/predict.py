import os
import json
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from typing import Optional, List
from schemas.prediction import (
    PredictionResult, 
    ParseObservationResponse, 
    SessionSummary, 
    HealthResponse, 
    ErrorResponse,
    PatientInfo,
    InferenceResult
)
from services.preprocessor import PreprocessorService
from services.inference import InferenceService
from services.explanation import ExplanationService

router = APIRouter()

# Dependency injection for services (initialized in main.py)
def get_preprocessor() -> PreprocessorService:
    return PreprocessorService()

def get_inference_service(request: Request) -> InferenceService:
    return request.app.state.inference_service

def get_explanation_service(request: Request) -> ExplanationService:
    return request.app.state.explanation_service

@router.get("/health", response_model=HealthResponse)
async def health(inference_service: InferenceService = Depends(get_inference_service)):
    """Returns model load status."""
    is_loaded = inference_service.is_loaded()
    return HealthResponse(
        status="ok" if is_loaded else "degraded",
        model_loaded=is_loaded
    )

@router.post("/parse-observation", response_model=ParseObservationResponse)
async def parse_observation(
    observation_file: UploadFile = File(...),
    preprocessor: PreprocessorService = Depends(get_preprocessor)
):
    """Parses a JSON observation file and returns session summaries."""
    if not observation_file.filename.endswith(".json"):
        raise HTTPException(status_code=422, detail="Invalid file type. Please upload a JSON file.")
    
    try:
        content = await observation_file.read()
        data = json.loads(content)
        
        # This will raise HTTPException(422) if validation fails internally
        observation = preprocessor.parse_observation(data)
        
        session_summaries = []
        for session in observation.sessions:
            wrists = [r.device_location for r in session.records]
            session_summaries.append(SessionSummary(
                record_name=session.record_name,
                wrists=wrists,
                rows=session.rows
            ))
            
        return ParseObservationResponse(
            subject_id=observation.subject_id,
            sessions=session_summaries
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON format.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict", response_model=PredictionResult)
async def predict(
    observation_file: UploadFile = File(...),
    patient_file: Optional[UploadFile] = File(None),
    session: str = Form(...),
    wrist: str = Form(...),
    preprocessor: PreprocessorService = Depends(get_preprocessor),
    inference_service: InferenceService = Depends(get_inference_service),
    explanation_service: ExplanationService = Depends(get_explanation_service)
):
    """Full inference pipeline: preprocessing -> inference -> explanation."""
    
    try:
        # 1. Parse Observation
        obs_content = await observation_file.read()
        obs_data = json.loads(obs_content)
        observation = preprocessor.parse_observation(obs_data)
        
        # 2. Preprocess Signal
        # This raises HTTPException(422) if session/wrist not found or signal too short
        input_tensor = preprocessor.preprocess(observation, session, wrist)
        
        # 3. Model Inference
        inference_result: InferenceResult = inference_service.predict(input_tensor)
        
        # 4. Generate Explanation
        explanation = explanation_service.explain(inference_result, session)
        
        # 5. Build Result
        return PredictionResult(
            task1_label=inference_result.task1_label,
            task1_probabilities={"HC": inference_result.task1_probs[0], "PD": inference_result.task1_probs[1]},
            task2_label=inference_result.task2_label,
            task2_probabilities={"PD": inference_result.task2_probs[0], "DD": inference_result.task2_probs[1]},
            confidence_task1=max(inference_result.task1_probs),
            confidence_task2=max(inference_result.task2_probs),
            explanation=explanation,
            session=session,
            wrist=wrist,
            windows_analysed=inference_result.windows_analysed
        )
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON format in observation file.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Inference pipeline failed: {str(e)}")
