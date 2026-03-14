import pytest
from pydantic import ValidationError
from schemas.prediction import PredictionResult, ErrorResponse

def test_prediction_result_serialisation():
    # Verify PredictionResult serialises all 10 required fields with correct types
    pred_res = PredictionResult(
        task1_label="HC",
        task1_probabilities={"HC": 0.8, "PD": 0.2},
        task2_label="PD",
        task2_probabilities={"PD": 0.6, "DD": 0.4},
        confidence_task1=0.8,
        confidence_task2=0.6,
        explanation="The patient shows normal motor function.",
        session="Relaxed",
        wrist="LeftWrist",
        windows_analysed=10
    )
    
    dumped = pred_res.model_dump()
    assert "task1_label" in dumped
    assert "task1_probabilities" in dumped
    assert "task2_label" in dumped
    assert "task2_probabilities" in dumped
    assert "confidence_task1" in dumped
    assert "confidence_task2" in dumped
    assert "explanation" in dumped
    assert "session" in dumped
    assert "wrist" in dumped
    assert "windows_analysed" in dumped
    
    assert dumped["task1_label"] == "HC"
    assert dumped["task1_probabilities"] == {"HC": 0.8, "PD": 0.2}
    assert dumped["windows_analysed"] == 10

def test_error_response_serialisation():
    # Verify ErrorResponse always contains error and detail string fields
    err_res = ErrorResponse(error="Validation Error", detail="Session not found")
    dumped = err_res.model_dump()
    
    assert "error" in dumped
    assert "detail" in dumped
    assert dumped["error"] == "Validation Error"
    assert dumped["detail"] == "Session not found"

def test_error_response_missing_fields():
    with pytest.raises(ValidationError):
        ErrorResponse(error="Validation Error") # missing detail

def test_prediction_result_missing_fields():
    with pytest.raises(ValidationError):
        PredictionResult(
            task1_label="HC",
            task1_probabilities={"HC": 0.8, "PD": 0.2},
            # missing task2_label and others
        )
