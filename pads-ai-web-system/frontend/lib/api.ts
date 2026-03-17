import {
  ParseObservationResponse,
  PredictionResult,
  HealthResponse,
  ApiError,
  PredictRequest,
  SensorPredictResult,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail: ApiError;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = {
        error: 'Network Error',
        detail: `Request failed with status ${response.status}: ${response.statusText}`,
      };
    }
    throw errorDetail;
  }
  return response.json();
}

export const api = {
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(response);
  },

  async parseObservation(file: File): Promise<ParseObservationResponse> {
    const formData = new FormData();
    formData.append('observation_file', file);

    const response = await fetch(`${API_BASE_URL}/parse-observation`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ParseObservationResponse>(response);
  },

  async predict(params: PredictRequest): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('observation_file', params.observation_file);
    if (params.patient_file) {
      formData.append('patient_file', params.patient_file);
    }
    formData.append('session', params.session);
    formData.append('wrist', params.wrist);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<PredictionResult>(response);
  },

  // NEW: Sensor-based prediction
  async predictSensor(leftFile: File, rightFile: File, task: string): Promise<SensorPredictResult> {
    const formData = new FormData();
    formData.append('left_file', leftFile);
    formData.append('right_file', rightFile);
    formData.append('task', task);

    const response = await fetch(`${API_BASE_URL}/predict-sensor`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<SensorPredictResult>(response);
  },
};
