import pytest
import json
import io
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st, HealthCheck
import sys
from unittest.mock import MagicMock

# Mock torch BEFORE importing main to avoid DLL crash during collection
mock_torch = MagicMock()
sys.modules["torch"] = mock_torch
sys.modules["torch.nn"] = MagicMock()

from main import app

@pytest.fixture
def client():
    """Fixture that triggers lifespan events."""
    with TestClient(app) as c:
        yield c



# -- Property Tests --

@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(data=st.dictionaries(st.text(), st.text()))
def test_resource_type_validation_p6(client, data):
    """Property 6: Resource Type Validation - Rejects if resource_type != 'observation'."""
    # Ensure resource_type is NOT 'observation'
    if data.get("resource_type") == "observation":
        del data["resource_type"]
        
    json_content = json.dumps(data).encode("utf-8")
    files = {"observation_file": ("test.json", json_content, "application/json")}
    
    response = client.post("/parse-observation", files=files)
    
    # PreprocessorService raises 422 for non-observation
    assert response.status_code == 422
    assert "resource_type" in response.json().get("detail", "").lower()

@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(subject_id=st.text(min_size=1), 
       sessions=st.lists(st.fixed_dictionaries({
           "record_name": st.text(min_size=1),
           "rows": st.integers(min_value=1),
           "records": st.lists(st.fixed_dictionaries({
               "device_location": st.sampled_from(["LeftWrist", "RightWrist"]),
               "channels": st.just(["acc_x"]),
               "units": st.just(["g"]),
               "file_name": st.text()
           }), min_size=1)
       }), min_size=1, max_size=5))
def test_session_availability_p7(client, subject_id, sessions):
    """Property 7: Session Availability - Verifies parse response matches input sessions."""
    observation = {
        "resource_type": "observation",
        "subject_id": subject_id,
        "sampling_rate": 62,
        "sessions": sessions
    }
    
    json_content = json.dumps(observation).encode("utf-8")
    files = {"observation_file": ("test.json", json_content, "application/json")}
    
    response = client.post("/parse-observation", files=files)
    assert response.status_code == 200
    
    resp_data = response.json()
    assert resp_data["subject_id"] == subject_id
    assert len(resp_data["sessions"]) == len(sessions)
    
    # Check session names match
    input_names = [s["record_name"] for s in sessions]
    output_names = [s["record_name"] for s in resp_data["sessions"]]
    assert set(input_names) == set(output_names)

@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(subject_id=st.text(min_size=1))
def test_api_response_schema_completeness_p10(client, subject_id):
    """Property 10: API Response Schema Completeness - Ensures all required fields are present and typed correctly."""
    observation = {
        "resource_type": "observation",
        "subject_id": subject_id,
        "sampling_rate": 62,
        "sessions": [
            {
                "record_name": "Relaxed",
                "rows": 300,
                "records": [{"device_location": "LeftWrist", "channels": ["x"], "units": ["g"], "file_name": "d.txt"}]
            }
        ]
    }
    
    with patch("services.preprocessor.PreprocessorService.preprocess") as mock_prep, \
         patch("services.inference.InferenceService.predict") as mock_inf, \
         patch("services.explanation.ExplanationService.explain") as mock_expl:
         
        from services.inference import InferenceResult
        mock_prep.return_value = "mock_tensor"
        mock_inf.return_value = InferenceResult(
            task1_probs=[0.5, 0.5], task2_probs=[0.5, 0.5],
            task1_label="HC", task2_label="PD", windows_analysed=1
        )
        mock_expl.return_value = "Mock explanation."
        
        json_content = json.dumps(observation).encode("utf-8")
        files = {"observation_file": ("test.json", json_content, "application/json")}
        data = {"session": "Relaxed", "wrist": "LeftWrist"}
        
        response = client.post("/predict", files=files, data=data)
        assert response.status_code == 200
        
        resp_data = response.json()
        required_fields = [
            "task1_label", "task1_probabilities", "task2_label", "task2_probabilities",
            "confidence_task1", "confidence_task2", "explanation", "session", "wrist", "windows_analysed"
        ]
        for field in required_fields:
            assert field in resp_data
            assert resp_data[field] is not None

# -- Integration Tests --

def test_health_endpoint(client):
    """Verify /health returns 200 and correct structure."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data

def test_upload_too_large(client):
    """Verify 413 error for files over 10MB."""
    large_content = b"0" * (11 * 1024 * 1024) # 11MB
    files = {"observation_file": ("large.json", large_content, "application/json")}
    
    # Middleware intercepts before reaching router
    response = client.post("/parse-observation", files=files)
    assert response.status_code == 413
    assert "File too large" in response.json()["error"]

def test_parse_invalid_file_type(client):
    """Verify 422 for non-json files."""
    files = {"observation_file": ("test.txt", b"plain text", "text/plain")}
    response = client.post("/parse-observation", files=files)
    assert response.status_code == 422
    assert "JSON file" in response.json()["detail"]

def test_predict_flow_mocked(client):
    """Verify /predict flow with mocked services where possible or valid inputs."""
    # Construct a valid but minimal observation
    observation = {
        "resource_type": "observation",
        "subject_id": "test_subj",
        "sampling_rate": 62,
        "sessions": [
            {
                "record_name": "Relaxed",
                "rows": 300,
                "records": [
                    {"device_location": "LeftWrist", "channels": ["x"], "units": ["g"], "file_name": "dummy.txt"}
                ]
            }
        ]
    }
    
    # We mock out the actual signal extraction and inference to avoid needing real files/torch
    with patch("services.preprocessor.PreprocessorService.preprocess") as mock_prep, \
         patch("services.inference.InferenceService.predict") as mock_inf, \
         patch("services.explanation.ExplanationService.explain") as mock_expl:
         
        from services.inference import InferenceResult
        mock_prep.return_value = "mock_tensor"
        mock_inf.return_value = InferenceResult(
            task1_probs=[0.8, 0.2], task2_probs=[0.9, 0.1],
            task1_label="HC", task2_label="PD", windows_analysed=1
        )
        mock_expl.return_value = "Mock explanation text."
        
        json_content = json.dumps(observation).encode("utf-8")
        files = {"observation_file": ("test.json", json_content, "application/json")}
        data = {"session": "Relaxed", "wrist": "LeftWrist"}
        
        response = client.post("/predict", files=files, data=data)
        
        assert response.status_code == 200
        resp_data = response.json()
        assert resp_data["task1_label"] == "HC"
        assert resp_data["explanation"] == "Mock explanation text."
        assert resp_data["confidence_task1"] == 0.8

from unittest.mock import patch
