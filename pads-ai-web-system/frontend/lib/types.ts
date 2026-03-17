// -------- Existing types (preserved) --------
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

// -------- NEW: Sensor Predict types --------

export type DiagnosisLabel = 'HC' | 'PD' | 'DD' | "Healthy Control" | "Parkinson's Disease" | "Differential Diagnosis";

export interface SensorPredictResult {
  prediction: DiagnosisLabel;
  confidence: number;
  probabilities: {
    hc_vs_pd: [number, number]; // [p_HC, p_PD]
    pd_vs_dd: [number, number]; // [p_PD, p_DD]
  };
  report: string;
  metadata: {
    patient_id: string;
    task: string;
    left_file: string;
    right_file: string;
    windows_analysed: number;
    left_rows: number;
    right_rows: number;
  };
  signal_preview: {
    left: number[][];
    right: number[][];
  };
}

export const VALID_TASKS = [
  'CrossArms',
  'DrinkGlas',
  'Entrainment',
  'HoldWeight',
  'LiftHold',
  'PointFinger',
  'Relaxed',
  'StretchHold',
  'TouchIndex',
  'TouchNose',
] as const;

export type TaskName = typeof VALID_TASKS[number];

export const DIAGNOSIS_CONFIG: Record<DiagnosisLabel, { label: string; color: string; bgClass: string }> = {
  HC: { label: 'Healthy Control', color: '#22C55E', bgClass: 'badge-hc' },
  PD: { label: "Parkinson's Disease", color: '#EF4444', bgClass: 'badge-pd' },
  DD: { label: 'Differential Diagnosis', color: '#F97316', bgClass: 'badge-dd' },
  'Healthy Control': { label: 'Healthy Control', color: '#22C55E', bgClass: 'badge-hc' },
  "Parkinson's Disease": { label: "Parkinson's Disease", color: '#EF4444', bgClass: 'badge-pd' },
  'Differential Diagnosis': { label: 'Differential Diagnosis', color: '#F97316', bgClass: 'badge-dd' },
};
