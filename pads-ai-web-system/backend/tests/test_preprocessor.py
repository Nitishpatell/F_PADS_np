import pytest
import numpy as np
import pandas as pd
from hypothesis import given, settings, strategies as st
from hypothesis.extra.numpy import arrays
from fastapi import HTTPException
from schemas.prediction import Observation, Session, SessionRecord
from services.preprocessor import PreprocessorService
from unittest.mock import patch

# -- Property Tests --

@settings(max_examples=100)
@given(signal=arrays(np.float32, st.tuples(st.integers(min_value=256, max_value=2000), st.just(6)), elements=st.floats(allow_nan=False, allow_infinity=False, min_value=-1e6, max_value=1e6)))
def test_preprocessor_shape_invariant_p1(signal):
    # Feature: pads-ai-web-system, Property 1
    T = signal.shape[0]
    expected_N = T // 256
    
    segmented = PreprocessorService.segment(signal, window_size=256)
    assert segmented.shape == (expected_N, 256, 6)

@settings(max_examples=100, deadline=None)
@given(signal=arrays(np.float32, st.tuples(st.integers(min_value=10, max_value=1000), st.just(6)), elements=st.floats(allow_nan=False, allow_infinity=False, min_value=-1e5, max_value=1e5)))
def test_normalisation_ordering_preservation_p3(signal):
    # Feature: pads-ai-web-system, Property 3
    stds = np.std(signal, axis=0)
    non_zero_std_mask = stds > 1e-5
    
    if not np.any(non_zero_std_mask):
        return
        
    normalised = PreprocessorService.normalise(signal)
    
    for c in range(6):
        if non_zero_std_mask[c]:
            col = signal[:, c]
            norm_col = normalised[:, c]
            
            sorted_idx = np.argsort(col)
            assert np.all(np.diff(norm_col[sorted_idx]) >= -1e-4)

@settings(max_examples=100)
@given(signal=arrays(np.float32, st.tuples(st.integers(min_value=10, max_value=200), st.just(6)), elements=st.floats(allow_nan=False, allow_infinity=False, min_value=-1e3, max_value=1e3)))
def test_zero_variance_channel_safety_p4(signal):
    # Feature: pads-ai-web-system, Property 4
    signal[:, 0] = 5.0
    normalised = PreprocessorService.normalise(signal)
    assert np.allclose(normalised[:, 0], 0.0)

@settings(max_examples=100)
@given(signal=arrays(np.float32, st.tuples(st.integers(min_value=1, max_value=255), st.just(6)), elements=st.floats(allow_nan=False, allow_infinity=False)))
def test_insufficient_signal_rejection_p9(signal):
    # Feature: pads-ai-web-system, Property 9
    obs = Observation(subject_id="T01", sampling_rate=100, sessions=[
        Session(record_name="S1", rows=200, records=[
            SessionRecord(device_location="LeftWrist", channels=[], units=[], file_name="dummy.txt")
        ])
    ])
    
    with patch("pandas.read_csv") as mock_read:
        mock_read.return_value = pd.DataFrame(signal)
        with pytest.raises(HTTPException) as exc:
            PreprocessorService.extract_signal(obs, "S1", "LeftWrist", "")
        # The extract_signal should raise 422 if records drop Time successfully and check is <256
        assert exc.value.status_code == 422
        assert "Signal length is too short" in str(exc.value.detail)

# -- Unit Tests --

def test_parse_observation_valid():
    data = {
        "resource_type": "observation",
        "subject_id": "P001",
        "sampling_rate": 100,
        "sessions": [
            {
                "record_name": "Relaxed",
                "rows": 1000,
                "records": [
                    {
                        "device_location": "LeftWrist",
                        "channels": ["w_x"],
                        "units": ["rad/s"],
                        "file_name": "data.txt"
                    }
                ]
            }
        ]
    }
    obs = PreprocessorService.parse_observation(data)
    assert obs.subject_id == "P001"
    assert obs.sampling_rate == 100
    assert len(obs.sessions) == 1
    assert obs.sessions[0].record_name == "Relaxed"

def test_parse_observation_invalid():
    with pytest.raises(HTTPException) as exc1:
        PreprocessorService.parse_observation({
            "resource_type": "observation",
            "subject_id": "P001",
            "sampling_rate": 100,
            "sessions": []
        })
    assert exc1.value.status_code == 422
    
    with pytest.raises(HTTPException) as exc2:
        PreprocessorService.parse_observation({
            "subject_id": "P001",
            "sampling_rate": 100,
            "sessions": [{"record_name": "S1"}]
        })
    assert exc2.value.status_code == 422

def test_extract_signal():
    obs = Observation(subject_id="T01", sampling_rate=100, sessions=[
        Session(record_name="Relaxed", rows=300, records=[
            SessionRecord(device_location="LeftWrist", channels=[], units=[], file_name="dummy.txt")
        ])
    ])
    
    mock_df = pd.DataFrame(np.random.randn(300, 7), columns=["Time", "c1", "c2", "c3", "c4", "c5", "c6"])
    
    with patch("pandas.read_csv", return_value=mock_df):
        signal = PreprocessorService.extract_signal(obs, "Relaxed", "LeftWrist")
        assert signal.shape == (300, 6)

def test_normalise():
    signal = np.array([
        [1.0, 10.0, -5.0, 0.0, 0.0, 0.0],
        [3.0, 10.0, -3.0, 0.0, 0.0, 0.0],
        [5.0, 10.0, -1.0, 0.0, 0.0, 0.0],
        [7.0, 10.0,  1.0, 0.0, 0.0, 0.0]
    ], dtype=np.float32)
    
    norm = PreprocessorService.normalise(signal)
    
    assert np.allclose(np.mean(norm[:, 0]), 0.0, atol=1e-6)
    assert np.allclose(np.std(norm[:, 0]), 1.0, atol=1e-6)
    
    assert np.allclose(norm[:, 1], 0.0)

def test_segment():
    signal = np.ones((800, 6), dtype=np.float32)
    seg = PreprocessorService.segment(signal, window_size=256)
    assert seg.shape == (3, 256, 6)
