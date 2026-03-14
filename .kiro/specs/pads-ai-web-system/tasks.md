# Implementation Plan: PADS AI Web System

## Overview

Incremental implementation of the full-stack PADS AI Web System: FastAPI backend (Python) with signal preprocessing, Hierarchical Transformer inference, and Gemini explanation; Next.js frontend with Recharts signal visualisation and results display; Hugging Face model repository; and deployment configuration.

## Tasks

- [x] 1. Project scaffolding and configuration
  - Create `pads-ai-web-system/` root with `backend/` and `frontend/` subdirectories matching the defined project structure
  - Create `backend/requirements.txt` with: `fastapi`, `uvicorn`, `python-multipart`, `torch`, `numpy`, `pandas`, `hypothesis`, `pytest`, `pytest-asyncio`, `httpx`, `google-generativeai`, `huggingface_hub`, `pydantic`
  - Create `frontend/package.json` with dependencies: `next`, `react`, `react-dom`, `tailwindcss`, `recharts`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `typescript`
  - Create `frontend/tsconfig.json`, `tailwind.config.ts`, `next.config.ts` with App Router settings
  - Create `backend/.env.example` with `GEMINI_API_KEY=`, `HF_REPO_ID=`, `HF_TOKEN=`
  - _Requirements: 15.4_

- [x] 2. Backend data models and Pydantic schemas
  - [x] 2.1 Implement internal Python dataclasses in `backend/schemas/prediction.py`
    - Define `SessionRecord`, `Session`, `Observation`, `PatientInfo`, `InferenceResult` dataclasses
    - Define Pydantic schemas: `PredictionResult`, `ParseObservationResponse`, `SessionSummary`, `HealthResponse`, `ErrorResponse`
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7, 11.1_

  - [x]* 2.2 Write unit tests for schema serialisation
    - Verify `PredictionResult` serialises all 10 required fields with correct types
    - Verify `ErrorResponse` always contains `error` and `detail` string fields
    - _Requirements: 7.1, 7.7_

- [x] 3. Signal preprocessor service
  - [x] 3.1 Implement `PreprocessorService` in `backend/services/preprocessor.py`
    - `parse_observation(data: dict) -> Observation`: validate `resource_type == "observation"`, `sampling_rate > 0`, non-empty `sessions`; raise `HTTPException(422)` on failure
    - `extract_signal(obs, session, wrist) -> np.ndarray`: locate session+wrist record, read tab-separated `.txt` file via pandas, drop `Time` column → shape `(T, 6)`; raise `HTTPException(422)` if `T < 256` or session/wrist not found
    - `normalise(signal) -> np.ndarray`: per-channel z-score; set channel to `0.0` if `std == 0`
    - `segment(signal, window_size=256) -> np.ndarray`: integer-divide, discard tail → shape `(N, 256, 6)`
    - `preprocess(obs, session, wrist) -> torch.Tensor`: compose above steps → `float32` tensor `(N, 256, 6)`
    - _Requirements: 1.6, 1.7, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.3, 11.4, 11.5_

  - [x]* 3.2 Write property test P1: Preprocessing shape invariant
    - **Property 1: Preprocessing Shape Invariant**
    - Strategy: `arrays(float32, shape=(T, 6))` where `T >= 256`; assert output shape `== (T // 256, 256, 6)`
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 1`
    - **Validates: Requirements 3.5, 4.4, 4.5**

  - [x]* 3.3 Write property test P3: Normalisation ordering preservation
    - **Property 3: Normalisation Ordering Preservation**
    - Strategy: `arrays(float32, shape=(T, 6))` filtered to channels with non-zero std; assert `normalised(A) > normalised(B)` whenever `A > B`
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 3`
    - **Validates: Requirements 4.2**

  - [x]* 3.4 Write property test P4: Zero-variance channel safety
    - **Property 4: Zero-Variance Channel Safety**
    - Strategy: construct arrays with at least one constant column; assert no exception raised and that column is all-zero after normalisation
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 4`
    - **Validates: Requirements 4.3**

  - [x]* 3.5 Write property test P9: Insufficient signal rejection
    - **Property 9: Insufficient Signal Rejection**
    - Strategy: `arrays(float32, shape=(T, 6))` where `T < 256`; assert `HTTPException(422)` is raised
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 9`
    - **Validates: Requirements 3.3**

  - [x]* 3.6 Write unit tests for preprocessor in `backend/tests/test_preprocessor.py`
    - Parse a known observation dict and verify `subject_id`, `sampling_rate`, `sessions` fields
    - Extract signal from known session+wrist and verify shape `(T, 6)`
    - Verify z-score normalisation produces mean ≈ 0, std ≈ 1 on a known array
    - Verify segmentation discards trailing samples (e.g. `T=300` → `N=1`, 44 rows discarded)
    - Verify HTTP 422 on empty sessions array, missing session name, missing wrist
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.3, 4.4, 11.3, 11.4_


- [x] 4. Observation round-trip serialisation
  - [x] 4.1 Implement `to_dict()` / `from_dict()` helpers on `Observation` dataclass
    - Serialise `Observation` → JSON-compatible dict and re-parse back to `Observation`
    - _Requirements: 11.1, 11.2_

  - [x]* 4.2 Write property test P5: Observation round-trip serialisation
    - **Property 5: Observation Round-Trip Serialisation**
    - Strategy: `@composite` Hypothesis strategy building random `Observation` objects with valid session lists; assert `parse(serialise(obs)) == obs`
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 5`
    - **Validates: Requirements 11.2**

- [x] 5. Hugging Face model definition and repository
  - [x] 5.1 Implement `HierarchicalTransformer` in `backend/models/model.py`
    - Define `nn.Module` with per-window local transformer encoder, cross-attention aggregation, and two classification heads (`task1_head`, `task2_head`)
    - Accept input `(N, 256, 6)`, return `(task1_logits, task2_logits)` each shape `(N, 2)`
    - Load hyperparameters from `config.json`: `d_model=128`, `nhead=8`, `num_encoder_layers=4`, `num_cross_attn_layers=2`, `dropout=0.1`
    - _Requirements: 5.2_

  - [x] 5.2 Create Hugging Face repository files
    - Create `huggingface-repo/model.py` mirroring `backend/models/model.py`
    - Create `huggingface-repo/config.json` with model hyperparameters
    - Create `huggingface-repo/inference.py` standalone helper for HF Spaces demo
    - Create `huggingface-repo/requirements.txt` with `torch`, `numpy`, `pandas`
    - Create `huggingface-repo/README.md` model card with dataset info, performance metrics, usage instructions
    - Copy `Final results/checkpoints/best_model.pth` to `huggingface-repo/best_model.pth`
    - _Requirements: 5.1_

- [x] 6. Inference service
  - [x] 6.1 Implement `InferenceService` in `backend/services/inference.py`
    - `__init__(repo_id, config_path)`: store config, initialise `model = None`
    - `load_model()`: download `best_model.pth` from Hugging Face Hub via `huggingface_hub.hf_hub_download`, instantiate `HierarchicalTransformer`, load state dict, set `eval()` mode
    - `is_loaded() -> bool`: return `model is not None`
    - `predict(tensor) -> InferenceResult`: run `model(tensor)` → softmax per task → mean across N windows → argmax labels; raise `HTTPException(503)` if not loaded
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x]* 6.2 Write property test P2: Probability sum invariant
    - **Property 2: Probability Sum Invariant**
    - Strategy: `arrays(float32, shape=(N, 256, 6))` where `N >= 1`; assert `abs(sum(task1_probs) - 1.0) < 1e-5` and `abs(sum(task2_probs) - 1.0) < 1e-5`
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 2`
    - **Validates: Requirements 5.3, 5.4, 7.4, 7.5**

  - [x]* 6.3 Write property test P8: Argmax label consistency
    - **Property 8: Argmax Label Consistency**
    - Strategy: generate pairs `(p_A, p_B)` where `p_A + p_B == 1.0`; assert label is first class iff `p_A > p_B`
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 8`
    - **Validates: Requirements 5.6**

  - [x]* 6.4 Write unit tests for inference service in `backend/tests/test_inference.py`
    - Mock model forward pass and verify `task1_probs` and `task2_probs` shapes are `[2]`
    - Verify mean aggregation across windows produces single prediction
    - Verify argmax label derivation for known probability pairs (e.g. `[0.3, 0.7]` → `"PD"`)
    - Verify `is_loaded()` returns `False` before `load_model()` is called
    - _Requirements: 5.3, 5.4, 5.5, 5.6_


- [x] 7. Explanation service
  - [x] 7.1 Implement `ExplanationService` in `backend/services/explanation.py`
    - `__init__(api_key, model_name="gemini-2.0-flash")`: initialise `google.generativeai` client
    - `explain(inference_result, session) -> str`: build Gemini prompt from template (task labels, confidence scores, session, windows, low-confidence warning when confidence < 0.5); POST with `timeout=10s`; return fallback string on any exception
    - Ensure no patient identifiers (`id`, name, DOB) are included in the prompt
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x]* 7.2 Write unit tests for explanation service in `backend/tests/test_explanation.py`
    - Mock Gemini success response → verify returned string length ≥ 50 chars
    - Mock Gemini timeout → verify fallback string is returned exactly
    - Verify low-confidence warning appears in prompt when `confidence < 0.5`
    - Verify patient `id` field is absent from the constructed prompt
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 8. FastAPI application and endpoints
  - [x] 8.1 Implement `backend/main.py`
    - Create FastAPI app with `lifespan` context that calls `inference_service.load_model()` at startup
    - Configure CORS to allow frontend origin
    - Register `predict` router
    - Add global exception handler returning `{"error": "Internal server error", "detail": str(exc)}` with HTTP 500 and server-side stack trace logging
    - Enforce 10 MB upload limit returning HTTP 413 with `ErrorResponse`
    - _Requirements: 5.7, 14.3, 14.4, 15.1, 15.2, 15.3, 15.5_

  - [x] 8.2 Implement `GET /health` in `backend/routers/predict.py`
    - Return `{"status": "ok", "model_loaded": true}` when model loaded, `{"status": "degraded", "model_loaded": false}` otherwise; always HTTP 200
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 8.3 Implement `POST /parse-observation` in `backend/routers/predict.py`
    - Accept `multipart/form-data` with `observation_file`
    - Call `preprocessor.parse_observation()`, build `ParseObservationResponse` with session summaries (record_name, wrists, rows)
    - Return HTTP 422 `ErrorResponse` on validation failure
    - _Requirements: 1.6, 2.1, 11.1, 11.3, 11.4_

  - [x] 8.4 Implement `POST /predict` in `backend/routers/predict.py`
    - Accept `multipart/form-data`: `observation_file` (required), `patient_file` (optional), `session`, `wrist`
    - Validate `resource_type` fields; call preprocessor → inference → explanation pipeline
    - Return `PredictionResult` HTTP 200 or appropriate `ErrorResponse`
    - Parse `patient_file` if provided and include `PatientInfo` in response context (for frontend display)
    - _Requirements: 1.6, 1.7, 3.3, 5.7, 7.1, 7.6, 7.7, 14.4, 15.1, 15.2, 15.3_

  - [ ]* 8.5 Write property test P6: Resource type validation
    - **Property 6: Resource Type Validation**
    - Strategy: `dictionaries(text(), text())` without `resource_type == "observation"`; POST to `/parse-observation`; assert HTTP 422 with non-empty `error` field
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 6`
    - **Validates: Requirements 1.6, 1.7**

  - [ ]* 8.6 Write property test P7: Session availability in parse response
    - **Property 7: Session Availability in Parse Response**
    - Strategy: build random valid observation dicts with N sessions; POST to `/parse-observation`; assert response `sessions` array length == N and all `record_name` values match
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 7`
    - **Validates: Requirements 2.1**

  - [ ]* 8.7 Write property test P10: API response schema completeness
    - **Property 10: API Response Schema Completeness**
    - Strategy: generate valid multipart predict requests with random valid signals; assert response contains all 10 required fields with correct types
    - `@settings(max_examples=100)` — tag: `# Feature: pads-ai-web-system, Property 10`
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x]* 8.8 Write API integration tests in `backend/tests/test_api.py`
    - `GET /health` returns 200 with `status` and `model_loaded` fields
    - `POST /parse-observation` with valid file returns correct session list
    - `POST /predict` with valid multipart form returns 200 with all 10 required fields
    - `POST /predict` with file > 10 MB returns 413
    - `POST /predict` with wrong `resource_type` returns 422
    - `POST /predict` with signal < 256 rows returns 422
    - `POST /predict` with invalid session+wrist combination returns 422
    - _Requirements: 1.6, 1.7, 3.3, 5.7, 7.1, 12.1, 12.2, 14.4, 15.3_

- [-] 9. Checkpoint — backend complete
  - Ensure all backend tests pass, ask the user if questions arise.


- [ ] 10. Frontend API client and TypeScript types
  - [ ] 10.1 Define TypeScript interfaces in `frontend/lib/types.ts`
    - `PredictionResult`, `ParseObservationResponse`, `SessionSummary`, `PatientInfo`, `HealthResponse`, `ApiError`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 10.2 Implement `frontend/lib/api.ts` typed fetch wrapper
    - `parseObservation(file: File): Promise<ParseObservationResponse>`
    - `predict(params: PredictRequest): Promise<PredictionResult>`
    - `health(): Promise<HealthResponse>`
    - Throw structured `ApiError` (with `error` and `detail` fields) on non-2xx responses
    - _Requirements: 14.1, 14.2_

- [ ] 11. Frontend layout and page shell
  - [ ] 11.1 Implement `frontend/app/layout.tsx`
    - Set `<title>` and `<meta>` tags; import Tailwind globals
    - _Requirements: 16.4_

  - [ ] 11.2 Implement `frontend/app/page.tsx` main analysis page
    - Orchestrate state: `observationFile`, `patientFile`, `parseResult`, `selectedSession`, `selectedWrist`, `predictionResult`, `loading`, `error`
    - Call `api.health()` on mount; display warning banner if `model_loaded == false`
    - Display progress indicator within 200 ms of submit (set loading state before `await`)
    - Provide "New Analysis" button that resets all state
    - Display application title and research disclaimer
    - _Requirements: 9.8, 12.4, 13.2, 16.4, 16.5_

- [ ] 12. FileUpload component
  - [ ] 12.1 Implement `frontend/components/FileUpload.tsx`
    - Render drag-and-drop / click-to-upload zone with `accept=".json"`
    - Validate `.json` extension client-side; call `onFile(null)` and display `"Please upload a valid JSON file"` on invalid selection
    - Display selected filename when valid file chosen
    - Props: `label`, `accept`, `onFile`, `error?`
    - Add `aria-label` on the file input
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 16.1, 16.2_

  - [ ]* 12.2 Write unit tests for FileUpload in `frontend/__tests__/FileUpload.test.tsx`
    - Renders file input with `accept=".json"`
    - Shows error message on non-JSON file selection
    - Calls `onFile` with the file object on valid `.json` selection
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 13. SessionSelector component
  - [ ] 13.1 Implement `frontend/components/SessionSelector.tsx`
    - Render session dropdown populated from `sessions: SessionSummary[]`
    - Default to `"Relaxed"` if present, otherwise first session
    - Render LeftWrist / RightWrist radio buttons; default to `"LeftWrist"`
    - Display row count for selected session+wrist combination
    - Props: `sessions`, `selectedSession`, `selectedWrist`, `onSessionChange`, `onWristChange`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 13.2 Write unit tests for SessionSelector in `frontend/__tests__/SessionSelector.test.tsx`
    - Renders all session names from parsed observation
    - Defaults selected session to `"Relaxed"` when present
    - Displays row count for selected session+wrist
    - _Requirements: 2.1, 2.3, 2.6_

- [ ] 14. SignalChart component
  - [ ] 14.1 Implement `frontend/components/SignalChart.tsx`
    - Render a single Recharts `LineChart` for one sensor channel
    - Display channel name and unit (`g` or `rad/s`) as chart label
    - Use `timeValues` for X-axis
    - Enable zoom and pan via Recharts `ReferenceArea` brush or `recharts-zoom` plugin
    - Show loading skeleton (e.g. `animate-pulse` div) when `signalValues` is empty
    - Add `aria-label` on the chart container
    - Props: `channel`, `unit`, `timeValues`, `signalValues`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 16.2_

  - [ ] 14.2 Wire 6 `SignalChart` instances in `page.tsx`
    - Render one chart per channel after `parseResult` is available
    - Update all 6 charts when session or wrist selection changes
    - _Requirements: 8.1, 8.5_


- [ ] 15. ResultsPanel component
  - [ ] 15.1 Implement `frontend/components/ResultsPanel.tsx`
    - Display Task 1 label (`HC` / `PD`) with colour-coded badge: green for HC, amber for PD
    - Display Task 2 label (`PD` / `DD`) with colour-coded badge
    - Display confidence scores as percentages rounded to 1 decimal place
    - Render horizontal probability bars for both tasks showing relative class probabilities
    - Display windows analysed, session, and wrist in results summary
    - Show low-confidence warning `"Low confidence result — clinical review recommended."` when either confidence < 0.5
    - Props: `result: PredictionResult`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

  - [ ]* 15.2 Write unit tests for ResultsPanel in `frontend/__tests__/ResultsPanel.test.tsx`
    - Displays correct Task 1 and Task 2 labels
    - Renders confidence as percentage with 1 decimal place
    - Shows low-confidence warning when confidence < 0.5
    - Does not show warning when both confidences ≥ 0.5
    - _Requirements: 9.1, 9.2, 9.3, 9.6_

- [ ] 16. PatientCard component
  - [ ] 16.1 Implement `frontend/components/PatientCard.tsx`
    - Display `condition` (labelled "Ground Truth (from dataset)"), `age`, `gender`, `handedness`, `height` (cm), `weight` (kg)
    - Show `"N/A"` for any missing demographic field
    - Show `"No patient file uploaded"` when `patient` is null
    - Never render the `id` field
    - Props: `patient: PatientInfo | null`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 16.2 Write unit tests for PatientCard in `frontend/__tests__/PatientCard.test.tsx`
    - Shows `"No patient file uploaded"` when patient is null
    - Renders all demographic fields when patient is provided
    - Never renders the `id` field even when present in data
    - Shows `"N/A"` for missing fields
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

- [ ] 17. ExplanationPanel component
  - [ ] 17.1 Implement `frontend/components/ExplanationPanel.tsx`
    - Render explanation text in a card titled `"AI Medical Explanation"`
    - Show spinner when `loading` is true
    - Props: `explanation: string`, `loading: boolean`
    - _Requirements: 9.5_

  - [ ]* 17.2 Write unit tests for ExplanationPanel in `frontend/__tests__/ExplanationPanel.test.tsx`
    - Shows spinner when `loading=true`
    - Renders explanation text when `loading=false` and explanation is provided
    - _Requirements: 9.5_

- [ ] 18. Frontend error handling and accessibility
  - [ ] 18.1 Implement global error banner in `page.tsx`
    - Display human-readable error from API `error` field on any 4xx/5xx response
    - Display `"Network error — please check your connection and try again."` on fetch failure
    - Ensure all interactive controls have visible labels and correct `aria-label` attributes
    - Verify logical tab order: upload → session selection → submit → results
    - _Requirements: 14.1, 14.2, 16.1, 16.2, 16.3_

- [ ] 19. Checkpoint — frontend complete
  - Ensure all frontend tests pass, ask the user if questions arise.

- [ ] 20. Integration wiring and end-to-end flow
  - [ ] 20.1 Wire full predict flow in `page.tsx`
    - On file upload: call `api.parseObservation()` → populate `SessionSelector` and `SignalChart` components
    - On submit: set `loading=true`, call `api.predict()`, set `predictionResult`, set `loading=false`
    - Pass `predictionResult` to `ResultsPanel` and `ExplanationPanel`
    - Pass parsed `patientInfo` to `PatientCard`
    - _Requirements: 1.5, 2.1, 2.2, 5.2, 9.1, 10.1, 13.2_

  - [ ] 20.2 Wire health check banner in `page.tsx`
    - Call `api.health()` on mount; if `model_loaded == false`, display persistent warning banner
    - _Requirements: 12.4_

- [ ] 21. Deployment configuration
  - [ ] 21.1 Create `backend/Dockerfile`
    - Base image `python:3.11-slim`; install requirements; expose port 8000; `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
    - _Requirements: 13.3_

  - [ ] 21.2 Create `frontend/Dockerfile` (optional for self-hosting)
    - Multi-stage Next.js build; expose port 3000
    - _Requirements: 15.4_

  - [ ] 21.3 Create `docker-compose.yml` at project root
    - Services: `backend` (port 8000) and `frontend` (port 3000) with `NEXT_PUBLIC_API_URL` env var pointing to backend
    - _Requirements: 13.3_

- [ ] 22. Final checkpoint — all tests pass
  - Ensure all backend and frontend tests pass. Run `pytest backend/tests/ -v` and `jest --run` in `frontend/`. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- All 10 correctness properties have corresponding Hypothesis PBT sub-tasks (P1–P10)
- Property tests require `@settings(max_examples=100)` and the feature tag comment
- Backend tests use `pytest` + `pytest-asyncio` + `httpx` (ASGI test client)
- Frontend tests use Jest + React Testing Library
