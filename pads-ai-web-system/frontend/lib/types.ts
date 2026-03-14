export interface SessionSummary {
  record_name: string;
  wrists: string[];
  rows: number;
}

export interface ParseObservationResponse {
  subject_id: string;
  sessions: SessionSummary[];
}

export interface TaskProbabilities {
  HC?: number;
  PD: number;
  DD?: number;
}

export interface PredictionResult {
  task1_label: 'HC' | 'PD';
  task1_probabilities: Record<string, number>;
  task2_label: 'PD' | 'DD';
  task2_probabilities: Record<string, number>;
  confidence_task1: number;
  confidence_task2: number;
  explanation: string;
  session: string;
  wrist: string;
  windows_analysed: number;
}

export interface PatientInfo {
  condition: string;
  age: number | null;
  gender: string | null;
  handedness: string | null;
  height: number | null;
  weight: number | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  model_loaded: boolean;
}

export interface ApiError {
  error: string;
  detail: string;
}

export interface PredictRequest {
  observation_file: File;
  patient_file?: File;
  session: string;
  wrist: 'LeftWrist' | 'RightWrist';
}
