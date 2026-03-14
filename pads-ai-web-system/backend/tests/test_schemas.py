import pytest
from pydantic import ValidationError
from hypothesis import given, settings, strategies as st
from schemas.prediction import PredictionResult, ErrorResponse, Observation, Session, SessionRecord

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


@st.composite
def observation_strategy(draw):
    records = st.lists(
        st.builds(SessionRecord,
            device_location=st.sampled_from(["LeftWrist", "RightWrist"]),
            channels=st.just(["w_x", "w_y", "w_z", "a_x", "a_y", "a_z"]),
            units=st.just(["rad/s", "rad/s", "rad/s", "g", "g", "g"]),
            file_name=st.text(min_size=1)
        ),
        min_size=1, max_size=3
    )

    sessions = st.lists(
        st.builds(Session,
            record_name=st.text(min_size=1),
            rows=st.integers(min_value=1),
            records=records
        ),
        min_size=1, max_size=3
    )

    return draw(st.builds(Observation,
        subject_id=st.text(min_size=1),
        sampling_rate=st.integers(min_value=1),
        sessions=sessions
    ))

@settings(max_examples=100)
@given(obs=observation_strategy())
def test_observation_roundtrip_serialisation_p5(obs):
    # Feature: pads-ai-web-system, Property 5
    serialized = obs.to_dict()
    parsed = Observation.from_dict(serialized)
    assert parsed == obs
