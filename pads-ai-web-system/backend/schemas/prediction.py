from dataclasses import dataclass
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel


# Internal Dataclasses

@dataclass
class SessionRecord:
    device_location: str       # "LeftWrist" | "RightWrist"
    channels: List[str]
    units: List[str]
    file_name: str             # relative path to .txt timeseries


@dataclass
class Session:
    record_name: str           # e.g. "Relaxed"
    rows: int
    records: List[SessionRecord]


@dataclass
class Observation:
    subject_id: str
    sampling_rate: int
    sessions: List[Session]

    def to_dict(self) -> dict:
        return {
            "resource_type": "observation",
            "subject_id": self.subject_id,
            "sampling_rate": self.sampling_rate,
            "sessions": [
                {
                    "record_name": s.record_name,
                    "rows": s.rows,
                    "records": [
                        {
                            "device_location": r.device_location,
                            "channels": r.channels,
                            "units": r.units,
                            "file_name": r.file_name
                        }
                        for r in s.records
                    ]
                }
                for s in self.sessions
            ]
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Observation':
        sessions = []
        for s_data in data.get("sessions", []):
            records = []
            for r_data in s_data.get("records", []):
                records.append(SessionRecord(
                    device_location=r_data.get("device_location", ""),
                    channels=r_data.get("channels", []),
                    units=r_data.get("units", []),
                    file_name=r_data.get("file_name", "")
                ))
            sessions.append(Session(
                record_name=s_data.get("record_name", ""),
                rows=s_data.get("rows", 0),
                records=records
            ))
        return cls(
            subject_id=data.get("subject_id", ""),
            sampling_rate=data.get("sampling_rate", 0),
            sessions=sessions
        )


@dataclass
class PatientInfo:
    condition: str             # "Healthy" | "PD" | "DD"
    age: Optional[int]
    gender: Optional[str]
    handedness: Optional[str]
    height: Optional[float]
    weight: Optional[float]


@dataclass
class InferenceResult:
    task1_probs: List[float]   # [p_HC, p_PD]
    task2_probs: List[float]   # [p_PD, p_DD]
    task1_label: str           # "HC" | "PD"
    task2_label: str           # "PD" | "DD"
    windows_analysed: int
    final_label: str           # "HC" | "PD" | "DD"


# API Pydantic Schemas

class PredictRequest(BaseModel):
    # Delivered as multipart form fields
    session: str
    wrist: Literal["LeftWrist", "RightWrist"]
    # Files: observation_file (required), patient_file (optional) are handled via FastAPI UploadFile


class TaskProbabilities(BaseModel):
    HC: Optional[float] = None    # Task 1 only
    PD: float
    DD: Optional[float] = None    # Task 2 only


class PredictionResult(BaseModel):
    task1_label: Literal["HC", "PD"]
    task1_probabilities: Dict[str, float]   # {"HC": float, "PD": float}
    task2_label: Literal["PD", "DD"]
    task2_probabilities: Dict[str, float]   # {"PD": float, "DD": float}
    confidence_task1: float
    confidence_task2: float
    explanation: str
    session: str
    wrist: str
    windows_analysed: int


class SessionSummary(BaseModel):
    record_name: str
    wrists: List[str]
    rows: int


class ParseObservationResponse(BaseModel):
    subject_id: str
    sessions: List[SessionSummary]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_loaded: bool


class ErrorResponse(BaseModel):
    error: str
    detail: str
