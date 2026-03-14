# Requirements Document

## Introduction

PADS AI Web System is a full-stack web application for Parkinson's Disease detection and monitoring using smartwatch sensor data. The system accepts PADS-format observation JSON files, preprocesses the 6-channel IMU signals (Accelerometer X/Y/Z, Gyroscope X/Y/Z), runs inference through a trained Hierarchical Transformer model hosted on Hugging Face, and generates human-readable medical explanations via the Google Gemini API. The application targets researchers and clinicians who need to analyse movement data from the PADS dataset (469 patients, Apple Watch Series 4, 100 Hz) and obtain AI-assisted classification results for two tasks: HC vs PD (Healthy Control vs Parkinson's Disease) and PD vs DD (Parkinson's Disease vs Differential Diagnosis).

This is a Final Year BE Research & Development project by Nitish Patel. The system is for research and educational purposes only and does not constitute a medical diagnostic tool.

---

## Glossary

- **PADS**: Parkinson's Disease Smartwatch Dataset — the source dataset of 469 patient observations recorded with Apple Watch Series 4 at 100 Hz.
- **Observation_File**: A PADS-format JSON file (e.g. `observation_001.json`) describing a patient's recording sessions, device metadata, and references to timeseries data files.
- **Patient_File**: A PADS-format JSON file (e.g. `patient_001.json`) containing patient demographics: condition, age, gender, handedness, height, weight.
- **Session**: A named movement task within an Observation_File. Valid session names: `Relaxed`, `RelaxedTask`, `StretchHold`, `LiftHold`, `HoldWeight`, `PointFinger`, `DrinkGlas`, `CrossArms`, `TouchIndex`, `TouchNose`, `Entrainment`.
- **Wrist**: The device location for a recording within a session. Valid values: `LeftWrist`, `RightWrist`.
- **Signal**: A multivariate time series of 6 sensor channels extracted from a selected Session and Wrist: `Accelerometer_X`, `Accelerometer_Y`, `Accelerometer_Z` (units: g), `Gyroscope_X`, `Gyroscope_Y`, `Gyroscope_Z` (units: rad/s). The Time channel is excluded from model input.
- **Window**: A fixed-length segment of 256 consecutive time steps extracted from a Signal.
- **Preprocessor**: The backend component responsible for parsing Observation_Files, extracting Signals, creating Windows, and normalising data.
- **Model**: The trained Hierarchical Transformer with Cross-Attention PyTorch model hosted on Hugging Face, performing two classification tasks.
- **Task_1**: Binary classification — HC (Healthy Control) vs PD (Parkinson's Disease).
- **Task_2**: Binary classification — PD (Parkinson's Disease) vs DD (Differential Diagnosis).
- **Inference_Engine**: The backend component that loads the Model from Hugging Face and runs forward passes to produce probability scores.
- **Explanation_Engine**: The backend component that calls the Google Gemini API (gemini-2.0-flash or gemini-1.5-flash) to generate a human-readable medical explanation from prediction results.
- **API**: The FastAPI backend exposing HTTP endpoints consumed by the Frontend.
- **Frontend**: The Next.js web application providing the user interface.
- **Prediction_Result**: A structured JSON object returned by the API containing classification labels, probability scores, and a Gemini explanation.
- **HC**: Healthy Control — a patient with no neurological condition.
- **PD**: Parkinson's Disease.
- **DD**: Differential Diagnosis — a neurological condition other than PD (e.g. essential tremor).
- **Confidence_Score**: The maximum probability value from a classification task's softmax output, in the range [0.0, 1.0].
- **Confidence_Threshold**: The minimum Confidence_Score (0.5) below which the system flags a low-confidence result.

---

## Requirements

### Requirement 1: Observation File Upload

**User Story:** As a researcher, I want to upload a PADS observation JSON file, so that I can submit sensor data for AI analysis without manually entering data.

#### Acceptance Criteria

1. THE Frontend SHALL provide a file upload control that accepts JSON files.
2. WHEN a user selects a file with a `.json` extension, THE Frontend SHALL display the selected filename and enable the submission workflow.
3. IF a user selects a file that is not a `.json` file, THEN THE Frontend SHALL display an error message stating "Please upload a valid JSON file" and SHALL NOT enable submission.
4. THE Frontend SHALL provide a separate optional file upload control for a Patient_File.
5. WHEN both an Observation_File and a Patient_File are uploaded, THE Frontend SHALL associate them for the same analysis session.
6. IF an uploaded Observation_File does not contain a `resource_type` field equal to `"observation"`, THEN THE API SHALL return HTTP 422 with an error message identifying the invalid field.
7. IF an uploaded Patient_File does not contain a `resource_type` field equal to `"patient"`, THEN THE API SHALL return HTTP 422 with an error message identifying the invalid field.

---

### Requirement 2: Session and Wrist Selection

**User Story:** As a researcher, I want to select which movement session and wrist to analyse, so that I can focus the AI inference on the most clinically relevant recording.

#### Acceptance Criteria

1. WHEN an Observation_File is successfully parsed, THE Frontend SHALL display a dropdown listing all Session names present in the file.
2. WHEN a Session is selected, THE Frontend SHALL display a second control allowing selection of `LeftWrist` or `RightWrist`.
3. THE Frontend SHALL default the Session selection to `Relaxed` if that session is present in the Observation_File.
4. THE Frontend SHALL default the Wrist selection to `LeftWrist`.
5. IF the selected Session does not contain a record for the selected Wrist, THEN THE API SHALL return HTTP 422 with an error message stating the session-wrist combination is unavailable.
6. WHEN a Session and Wrist are selected, THE Frontend SHALL display the number of rows available for that recording.

---

### Requirement 3: Signal Parsing and Extraction

**User Story:** As a researcher, I want the system to automatically extract the 6 sensor channels from the selected session, so that I do not need to manually process raw data files.

#### Acceptance Criteria

1. WHEN a valid Session and Wrist are selected, THE Preprocessor SHALL extract the 6 sensor channels (`Accelerometer_X`, `Accelerometer_Y`, `Accelerometer_Z`, `Gyroscope_X`, `Gyroscope_Y`, `Gyroscope_Z`) from the corresponding timeseries data.
2. THE Preprocessor SHALL exclude the `Time` channel from model input tensors.
3. IF the extracted Signal contains fewer than 256 rows, THEN THE API SHALL return HTTP 422 with an error message stating "Insufficient data: signal must contain at least 256 time steps".
4. THE Preprocessor SHALL parse the timeseries data referenced by the `file_name` field in the Observation_File record.
5. FOR ALL valid Signals with at least 256 rows, THE Preprocessor SHALL produce a tensor of shape `(N, 256, 6)` where N is the number of non-overlapping 256-step Windows.

---

### Requirement 4: Signal Preprocessing and Normalisation

**User Story:** As a researcher, I want the sensor signals to be normalised before inference, so that the model receives input in the same format it was trained on.

#### Acceptance Criteria

1. THE Preprocessor SHALL apply per-channel z-score normalisation (zero mean, unit variance) to each of the 6 sensor channels independently across the full Signal before windowing.
2. WHEN normalisation is applied to a Signal, THE Preprocessor SHALL preserve the relative ordering of values within each channel (i.e. if value A > value B before normalisation, then normalised(A) > normalised(B)).
3. IF a channel has zero variance (all values identical), THEN THE Preprocessor SHALL set all normalised values for that channel to 0.0 and SHALL NOT raise a division-by-zero error.
4. THE Preprocessor SHALL segment the normalised Signal into non-overlapping Windows of exactly 256 time steps, discarding any trailing samples that do not form a complete Window.
5. FOR ALL valid inputs, THE Preprocessor SHALL produce output tensors where each Window contains exactly 256 time steps and exactly 6 channels.

---

### Requirement 5: Model Inference

**User Story:** As a researcher, I want the system to run the trained Hierarchical Transformer model on the preprocessed signal, so that I receive AI-based classification results.

#### Acceptance Criteria

1. THE Inference_Engine SHALL load the Model weights from Hugging Face at application startup and cache them in memory for subsequent requests.
2. WHEN a preprocessed tensor of shape `(N, 256, 6)` is provided, THE Inference_Engine SHALL run a forward pass through the Model and return probability scores for both Task_1 and Task_2.
3. FOR ALL valid inputs, THE Inference_Engine SHALL return Task_1 probabilities as a list of exactly 2 values `[p_HC, p_PD]` that sum to 1.0 within a tolerance of 1e-5.
4. FOR ALL valid inputs, THE Inference_Engine SHALL return Task_2 probabilities as a list of exactly 2 values `[p_PD, p_DD]` that sum to 1.0 within a tolerance of 1e-5.
5. THE Inference_Engine SHALL aggregate per-Window probabilities by computing the mean across all N Windows to produce a single prediction per task.
6. WHEN inference is complete, THE Inference_Engine SHALL return the predicted class label for Task_1 as `"HC"` or `"PD"`, and for Task_2 as `"PD"` or `"DD"`, based on the argmax of the aggregated probabilities.
7. IF the Model cannot be loaded from Hugging Face, THEN THE API SHALL return HTTP 503 with an error message stating "Model unavailable. Please try again later."
8. WHEN inference completes, THE Inference_Engine SHALL complete the forward pass within 15 seconds for inputs with up to 20 Windows on standard server hardware.

---

### Requirement 6: Gemini Medical Explanation

**User Story:** As a researcher, I want a human-readable explanation of the AI prediction, so that I can understand what movement patterns contributed to the result.

#### Acceptance Criteria

1. WHEN inference is complete, THE Explanation_Engine SHALL send the Task_1 label, Task_1 Confidence_Score, Task_2 label, Task_2 Confidence_Score, and selected Session name to the Gemini API.
2. THE Explanation_Engine SHALL request an explanation that references motor symptoms relevant to Parkinson's Disease (e.g. tremor, bradykinesia, rigidity) and includes a disclaimer that the result is not a clinical diagnosis.
3. WHEN the Gemini API returns a response, THE Explanation_Engine SHALL return a non-empty string explanation of at least 50 characters.
4. IF the Gemini API returns an error or times out after 10 seconds, THEN THE Explanation_Engine SHALL return the fallback message: "AI explanation unavailable. Please consult a medical professional for interpretation of these results."
5. WHERE the Task_1 Confidence_Score is below the Confidence_Threshold of 0.5, THE Explanation_Engine SHALL include a low-confidence warning in the explanation prompt sent to Gemini.
6. THE Explanation_Engine SHALL NOT include raw patient identifiers (name, date of birth) in the Gemini API request.

---

### Requirement 7: Prediction Result API Response

**User Story:** As a developer, I want the API to return a consistent structured JSON response, so that the Frontend can reliably parse and display results.

#### Acceptance Criteria

1. WHEN inference and explanation are complete, THE API SHALL return HTTP 200 with a JSON body containing all of the following fields: `task1_label`, `task1_probabilities`, `task2_label`, `task2_probabilities`, `confidence_task1`, `confidence_task2`, `explanation`, `session`, `wrist`, `windows_analysed`.
2. THE API SHALL return `task1_probabilities` as an object with keys `"HC"` and `"PD"` mapping to float values.
3. THE API SHALL return `task2_probabilities` as an object with keys `"PD"` and `"DD"` mapping to float values.
4. FOR ALL valid requests, THE API SHALL return a response where `task1_probabilities["HC"] + task1_probabilities["PD"]` equals 1.0 within a tolerance of 1e-5.
5. FOR ALL valid requests, THE API SHALL return a response where `task2_probabilities["PD"] + task2_probabilities["DD"]` equals 1.0 within a tolerance of 1e-5.
6. IF any required input field is missing from the request, THEN THE API SHALL return HTTP 422 with a JSON body containing an `"error"` field describing the missing field.
7. THE API SHALL return all error responses as JSON objects containing at minimum an `"error"` string field and a `"detail"` string field.

---

### Requirement 8: Signal Visualisation

**User Story:** As a researcher, I want to see interactive charts of the 6 sensor channels, so that I can visually inspect the movement patterns before and after analysis.

#### Acceptance Criteria

1. WHEN signal data is available, THE Frontend SHALL render 6 separate line charts, one for each sensor channel (`Accelerometer_X`, `Accelerometer_Y`, `Accelerometer_Z`, `Gyroscope_X`, `Gyroscope_Y`, `Gyroscope_Z`).
2. THE Frontend SHALL label each chart with the channel name and its unit (`g` for accelerometer channels, `rad/s` for gyroscope channels).
3. THE Frontend SHALL render the time axis using the `Time` channel values from the selected session record.
4. THE Frontend SHALL support interactive zoom and pan on the signal charts.
5. WHEN a new session or wrist is selected, THE Frontend SHALL update all 6 charts to reflect the newly selected signal data within 2 seconds.
6. IF signal data is not yet loaded, THE Frontend SHALL display a loading indicator in place of the charts.

---

### Requirement 9: Results Display

**User Story:** As a researcher, I want to see the prediction results and Gemini explanation clearly presented, so that I can interpret the AI output at a glance.

#### Acceptance Criteria

1. WHEN a Prediction_Result is received, THE Frontend SHALL display the Task_1 predicted label (`HC` or `PD`) prominently with a colour-coded indicator (green for HC, amber for PD).
2. WHEN a Prediction_Result is received, THE Frontend SHALL display the Task_2 predicted label (`PD` or `DD`) with a colour-coded indicator.
3. THE Frontend SHALL display the Confidence_Score for Task_1 and Task_2 as percentage values rounded to one decimal place.
4. THE Frontend SHALL display a horizontal probability bar showing the relative probabilities for both classes in each task.
5. THE Frontend SHALL display the Gemini explanation text in a clearly labelled section titled "AI Medical Explanation".
6. WHERE the Confidence_Score for either task is below the Confidence_Threshold of 0.5, THE Frontend SHALL display a visible warning: "Low confidence result — clinical review recommended."
7. THE Frontend SHALL display the number of Windows analysed and the selected Session and Wrist in the results summary.
8. WHEN results are displayed, THE Frontend SHALL provide a "New Analysis" button that resets the application to the upload state.

---

### Requirement 10: Patient Demographics Display

**User Story:** As a researcher, I want to see patient demographic information alongside the results, so that I can contextualise the prediction within the patient's profile.

#### Acceptance Criteria

1. WHEN a Patient_File is provided and successfully parsed, THE Frontend SHALL display the following fields: `condition`, `age`, `gender`, `handedness`, `height` (cm), `weight` (kg).
2. THE Frontend SHALL display the patient's `condition` field value (`Healthy`, `PD`, or `DD`) as a reference label, clearly marked as "Ground Truth (from dataset)".
3. IF no Patient_File is provided, THE Frontend SHALL display a message "No patient file uploaded" in the demographics panel without hiding other results.
4. IF the Patient_File is missing any demographic field, THE Frontend SHALL display "N/A" for that field.
5. THE Frontend SHALL NOT display the patient `id` field to avoid direct identification in the UI.

---

### Requirement 11: Observation File Parsing (Round-Trip Property)

**User Story:** As a developer, I want the observation file parser to be robust and verifiable, so that data integrity is maintained throughout the preprocessing pipeline.

#### Acceptance Criteria

1. THE Preprocessor SHALL parse a valid Observation_File JSON into an internal Observation object containing: `subject_id`, `sampling_rate`, `sessions` list.
2. FOR ALL valid Observation_File inputs, serialising the parsed Observation object back to a JSON-compatible dictionary and re-parsing it SHALL produce an equivalent Observation object (round-trip property).
3. WHEN parsing an Observation_File, THE Preprocessor SHALL validate that `sampling_rate` is a positive integer.
4. IF the `sessions` array in an Observation_File is empty, THEN THE API SHALL return HTTP 422 with an error message stating "Observation file contains no sessions".
5. THE Preprocessor SHALL correctly parse all 11 valid session names defined in the Glossary.

---

### Requirement 12: API Health and Availability

**User Story:** As a developer, I want a health check endpoint, so that I can verify the backend service and model are operational before running analyses.

#### Acceptance Criteria

1. THE API SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body `{"status": "ok", "model_loaded": true}` when the Model is loaded successfully.
2. WHEN the Model is not loaded, THE API SHALL return `{"status": "degraded", "model_loaded": false}` from the `GET /health` endpoint with HTTP 200.
3. THE API SHALL respond to `GET /health` within 500 milliseconds.
4. THE Frontend SHALL call `GET /health` on application load and display a warning banner if `model_loaded` is `false`.

---

### Requirement 13: Non-Functional — Performance

**User Story:** As a researcher, I want analysis results to be returned within a reasonable time, so that the tool is practical for iterative investigation.

#### Acceptance Criteria

1. WHEN a valid request with up to 8 Windows is submitted, THE API SHALL return a complete Prediction_Result within 10 seconds under normal load.
2. THE Frontend SHALL display a progress indicator within 200 milliseconds of the user submitting an analysis request.
3. THE API SHALL support at least 5 concurrent analysis requests without returning HTTP 5xx errors.

---

### Requirement 14: Non-Functional — Error Handling and Resilience

**User Story:** As a researcher, I want the system to handle errors gracefully, so that I receive clear feedback when something goes wrong rather than a blank screen.

#### Acceptance Criteria

1. IF the API returns any HTTP 4xx or 5xx response, THEN THE Frontend SHALL display a human-readable error message extracted from the response `"error"` field.
2. IF the Frontend loses network connectivity during an analysis request, THEN THE Frontend SHALL display an error message "Network error — please check your connection and try again."
3. WHEN an unhandled exception occurs in the API, THE API SHALL return HTTP 500 with a JSON body containing `"error": "Internal server error"` and SHALL log the full stack trace server-side.
4. THE API SHALL validate all incoming request payloads against defined schemas before processing and SHALL return HTTP 422 for any schema violation.

---

### Requirement 15: Non-Functional — Security and Data Handling

**User Story:** As a researcher, I want uploaded patient data to be handled securely, so that sensitive health information is not retained beyond the analysis session.

#### Acceptance Criteria

1. THE API SHALL NOT persist uploaded Observation_Files or Patient_Files to disk after the analysis request is complete.
2. THE API SHALL process uploaded files in memory only, within the scope of a single request lifecycle.
3. THE API SHALL enforce a maximum upload file size of 10 MB per file and SHALL return HTTP 413 if this limit is exceeded.
4. THE Frontend SHALL communicate with the API exclusively over HTTPS in production deployments.
5. THE API SHALL NOT log the contents of uploaded patient data files.

---

### Requirement 16: Non-Functional — Accessibility and Usability

**User Story:** As a researcher, I want the web interface to be clear and navigable, so that I can use it efficiently without prior training.

#### Acceptance Criteria

1. THE Frontend SHALL display all interactive controls with visible labels.
2. THE Frontend SHALL provide descriptive `aria-label` attributes on all icon-only buttons and chart elements.
3. THE Frontend SHALL maintain a logical tab order through the upload, session selection, and results sections.
4. THE Frontend SHALL display the application title "PADS AI — Parkinson's Disease Detection System" in the page header.
5. THE Frontend SHALL include a visible disclaimer: "This tool is for research purposes only and does not constitute medical advice."
