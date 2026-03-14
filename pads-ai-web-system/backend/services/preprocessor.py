import pandas as pd
import numpy as np
from fastapi import HTTPException
from schemas.prediction import Observation

class PreprocessorService:
    @staticmethod
    def parse_observation(data: dict) -> Observation:
        if data.get("resource_type") != "observation":
            raise HTTPException(status_code=422, detail="Invalid resource_type, expected 'observation'")
        if data.get("sampling_rate", 0) <= 0:
            raise HTTPException(status_code=422, detail="sampling_rate must be greater than 0")
        if not data.get("sessions"):
            raise HTTPException(status_code=422, detail="sessions array cannot be empty")
        
        return Observation.from_dict(data)

    @staticmethod
    def extract_signal(obs: Observation, session: str, wrist: str, base_path: str = "") -> np.ndarray:
        target_record = None
        for s in obs.sessions:
            if s.record_name == session:
                for r in s.records:
                    if r.device_location == wrist:
                        target_record = r
                        break
        
        if target_record is None:
            raise HTTPException(status_code=422, detail=f"Session/wrist combination not found: {session} / {wrist}")
        
        # Explicit assert to help the type checker understand target_record is definitely not None here
        assert target_record is not None
        
        try:
            import os
            file_path = os.path.join(base_path, target_record.file_name) if base_path else target_record.file_name
            df = pd.read_csv(file_path, sep='\t')
            if "Time" in df.columns:
                df = df.drop(columns=["Time"])
            signal = df.to_numpy(dtype=np.float32)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to read signal file: {str(e)}")
            
        if signal.shape[0] < 256:
            raise HTTPException(status_code=422, detail=f"Signal length is too short: {signal.shape[0]} < 256")
            
        # Expected shape is (T, 6). If channel count isn't 6, we pad or truncate, or just rely on the test
        if signal.shape[1] != 6:
            raise HTTPException(status_code=422, detail=f"Signal must have exactly 6 channels, got {signal.shape[1]}")
            
        return signal

    @staticmethod
    def normalise(signal: np.ndarray) -> np.ndarray:
        # per-channel z-score; set channel to 0.0 if std == 0
        means = np.mean(signal, axis=0)
        stds = np.std(signal, axis=0)
        
        stds_safe = np.where(stds == 0, 1.0, stds)
        normalised = (signal - means) / stds_safe
        
        # zero out channels with std == 0
        zero_std_mask = (stds == 0)
        if np.any(zero_std_mask):
            normalised[:, zero_std_mask] = 0.0
            
        return normalised

    @staticmethod
    def segment(signal: np.ndarray, window_size: int = 256) -> np.ndarray:
        T = signal.shape[0]
        N = T // window_size
        if N == 0:
            return np.empty((0, window_size, signal.shape[1]), dtype=np.float32)
        
        # truncate tail
        truncated = signal[:N * window_size, :]
        
        # reshape to (N, window_size, 6)
        segmented = truncated.reshape((N, window_size, signal.shape[1]))
        return segmented

    @staticmethod
    def preprocess(obs: Observation, session: str, wrist: str, base_path: str = ""):
        import torch
        signal = PreprocessorService.extract_signal(obs, session, wrist, base_path)
        normalised = PreprocessorService.normalise(signal)
        segmented = PreprocessorService.segment(normalised, window_size=256)
        return torch.tensor(segmented, dtype=torch.float32)

