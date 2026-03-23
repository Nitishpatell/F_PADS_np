"""
/predict-sensor endpoint — accepts raw left/right wrist sensor files + task name.
Validates filenames, column counts, patient-ID match, runs inference, returns result.
"""

import re
import io
import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from typing import List

from services.inference import InferenceService
from services.explanation import ExplanationService
from services.preprocessor import PreprocessorService
from schemas.prediction import InferenceResult

router = APIRouter()

# Valid tasks from the PADS dataset
VALID_TASKS = [
    "CrossArms", "DrinkGlas", "Entrainment", "HoldWeight",
    "LiftHold", "PointFinger", "Relaxed", "StretchHold",
    "TouchIndex", "TouchNose",
]

FILENAME_PATTERN = re.compile(
    r"^(\d+)_([A-Za-z]+)_(Left|Right)Wrist\.(txt|csv)$"
)


def _parse_filename(filename: str):
    """Return (patient_id, task, side) or raise 422."""
    m = FILENAME_PATTERN.match(filename)
    if not m:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid filename '{filename}'. Expected format: {{PatientID}}_{{Task}}_{{Side}}Wrist.txt"
        )
    return m.group(1), m.group(2), m.group(3)


def _read_sensor_file(content: bytes, filename: str) -> np.ndarray:
    """Read CSV/TXT sensor data → np.ndarray with shape (T, 6)."""
    try:
        text = content.decode("utf-8")
        # Auto-detect separator
        sep = "\t" if "\t" in text.split("\n")[0] else ","
        df = pd.read_csv(io.StringIO(text), sep=sep, header=None)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read '{filename}': {str(e)}")

    cols = df.shape[1]
    if cols == 7:
        # First column is Time — drop it
        df = df.iloc[:, 1:]
    elif cols != 6:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid sensor format in '{filename}': expected 6 or 7 columns, got {cols}"
        )

    signal = df.to_numpy(dtype=np.float32)
    if signal.shape[0] < 256:
        raise HTTPException(
            status_code=422,
            detail=f"Signal in '{filename}' too short: {signal.shape[0]} rows (need ≥256)"
        )
    return signal


# ---------- dependencies ----------
def get_inference_service(request: Request) -> InferenceService:
    return request.app.state.inference_service


def get_explanation_service(request: Request) -> ExplanationService:
    return request.app.state.explanation_service


# ---------- endpoint ----------
@router.post("/predict-sensor")
async def predict_sensor(
    left_file: UploadFile = File(...),
    right_file: UploadFile = File(...),
    task: str = Form(...),
    inference_service: InferenceService = Depends(get_inference_service),
    explanation_service: ExplanationService = Depends(get_explanation_service),
):
    """Full pipeline: validate → preprocess both wrists → inference → explanation."""

    # 1. Validate task
    if task not in VALID_TASKS:
        raise HTTPException(status_code=422, detail=f"Invalid task '{task}'. Must be one of: {', '.join(VALID_TASKS)}")

    # 2. Validate filenames
    left_name = left_file.filename or ""
    right_name = right_file.filename or ""

    left_pid, left_task, left_side = _parse_filename(left_name)
    right_pid, right_task, right_side = _parse_filename(right_name)

    # Patient ID must match
    if left_pid != right_pid:
        raise HTTPException(status_code=422, detail=f"Files must belong to same patient. Left={left_pid}, Right={right_pid}")

    # Side validation
    if left_side != "Left":
        raise HTTPException(status_code=422, detail=f"Left wrist file must have 'LeftWrist' in name, got '{left_side}Wrist'")
    if right_side != "Right":
        raise HTTPException(status_code=422, detail=f"Right wrist file must have 'RightWrist' in name, got '{right_side}Wrist'")

    # Task must match the selected task
    if left_task != task:
        raise HTTPException(status_code=422, detail=f"Left file task '{left_task}' doesn't match selected task '{task}'")
    if right_task != task:
        raise HTTPException(status_code=422, detail=f"Right file task '{right_task}' doesn't match selected task '{task}'")

    # 3. Read & validate sensor data
    left_content = await left_file.read()
    right_content = await right_file.read()

    left_signal = _read_sensor_file(left_content, left_name)
    right_signal = _read_sensor_file(right_content, right_name)

    # 4. Run signal-analysis-based inference using raw signals
    # (The neural network model has collapsed; we use biomechanical feature analysis instead)
    result: InferenceResult = inference_service.predict_signal(left_signal, right_signal)

    # 6. Derive final prediction label
    # Mapping codes to full labels as requested
    label_map = {
        "HC": "Healthy Control",
        "PD": "Parkinson's Disease",
        "DD": "Differential Diagnosis"
    }
    
    prediction_label = label_map.get(result.final_label, "Unknown")
    
    # Confidence calculation:
    # If healthy, confidence is task1[0]. If PD/DD, confidence is task2 probs.
    if result.final_label == "HC":
        confidence = result.task1_probs[0]
    else:
        # For PD and DD, we use Task 2 probabilities
        confidence = max(result.task2_probs)

    # 7. Generate explanation
    explanation = explanation_service.explain(result, task)

    # 8. Build response matching user request and frontend needs

    return {
        "diagnosis": prediction_label,
        "confidence": round(confidence, 4),
        "hc_prob": round(result.task1_probs[0], 4),
        "pd_prob": round(result.task1_probs[1], 4),
        "dd_prob": round(result.task2_probs[1], 4),
        "features": result.features,
        "gemini_report": explanation
    }
