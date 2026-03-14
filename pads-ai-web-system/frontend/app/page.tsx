'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  ParseObservationResponse,
  PredictionResult,
  HealthResponse,
  ApiError,
  PatientInfo,
} from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import SessionSelector from '@/components/SessionSelector';
import SignalChart from '@/components/SignalChart';
import ResultsPanel from '@/components/ResultsPanel';
import PatientCard from '@/components/PatientCard';
import ExplanationPanel from '@/components/ExplanationPanel';
import { AlertTriangle, RefreshCcw, Loader2, Activity } from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [observationFile, setObservationFile] = useState<File | null>(null);
  const [patientFile, setPatientFile] = useState<File | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [parseResult, setParseResult] = useState<ParseObservationResponse | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedWrist, setSelectedWrist] = useState<'LeftWrist' | 'RightWrist'>('LeftWrist');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Check health on mount
  useEffect(() => {
    api.health()
      .then(setHealth)
      .catch((err) => {
        setError(err);
        setHealth({ status: 'degraded', model_loaded: false });
      });
  }, []);

  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setObservationFile(null);
      setParseResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.parseObservation(file);
      setObservationFile(file);
      setParseResult(result);
      if (result.sessions.length > 0) {
        // Default to Relaxed if present
        const relaxed = result.sessions.find(s => s.record_name === 'Relaxed');
        setSelectedSession(relaxed ? 'Relaxed' : result.sessions[0].record_name);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePatientUpload = useCallback(async (file: File | null) => {
    setPatientFile(file);
    if (file) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.resource_type === 'patient') {
          setPatientInfo(data);
        } else {
          setError({ error: 'Validation Error', detail: 'Invalid patient file format' });
        }
      } catch (err) {
        setError({ error: 'Parse Error', detail: 'Could not parse patient JSON' });
      }
    } else {
      setPatientInfo(null);
    }
  }, []);

  const handlePredict = async () => {
    if (!observationFile || !selectedSession) return;

    setPredicting(true);
    setError(null);
    try {
      const result = await api.predict({
        observation_file: observationFile,
        patient_file: patientFile || undefined,
        session: selectedSession,
        wrist: selectedWrist,
      });
      setPredictionResult(result);
      // If the backend returned patient info (Requirement 8.4), we could update it here
      // But we are handling it client side for immediate feedback in this MVP
    } catch (err: any) {
      setError(err);
    } finally {
      setPredicting(false);
    }
  };

  const handleReset = () => {
    setObservationFile(null);
    setPatientFile(null);
    setPatientInfo(null);
    setParseResult(null);
    setPredictionResult(null);
    setError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Health Warning */}
      {health && !health.model_loaded && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-400 mr-2" />
            <p className="text-sm text-amber-700 font-medium">
              Model is currently unavailable — analysis may fail.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md shadow-sm animate-in slide-in-from-top-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-grow">
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-tight">{error.error}</h3>
              <p className="text-sm text-red-700 mt-1">{error.detail}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-500 bg-red-100/50 p-1 rounded-full transition-colors"
              aria-label="Dismiss error"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Research Input</h2>
              <p className="text-xs text-gray-500">Upload PADS-format JSON documents</p>
            </div>

            <FileUpload 
              label="Observation File (JSON)" 
              onFile={handleFileUpload}
              accept=".json"
            />
            
            <FileUpload 
              label="Patient File (Optional JSON)" 
              onFile={handlePatientUpload}
              accept=".json"
            />

            {loading && (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-semibold">Parsing observation...</span>
              </div>
            )}
          </section>

          {parseResult && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-bold text-gray-900">Analysis Parameters</h2>
              <SessionSelector 
                sessions={parseResult.sessions}
                selectedSession={selectedSession}
                selectedWrist={selectedWrist}
                onSessionChange={setSelectedSession}
                onWristChange={setSelectedWrist}
              />
              <button
                onClick={handlePredict}
                disabled={predicting || !selectedSession}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing Results...</span>
                  </>
                ) : (
                  <span>Initiate AI Inference</span>
                )}
              </button>
            </section>
          )}

          {predictionResult && (
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors shadow-sm"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset & New Analysis
            </button>
          )}
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-8 space-y-8">
          {/* Signal Visualization */}
          {parseResult && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">IMU Signal Streams</h2>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase">100Hz Real-time Data</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['Accelerometer_X', 'Accelerometer_Y', 'Accelerometer_Z', 'Gyroscope_X', 'Gyroscope_Y', 'Gyroscope_Z'].map(channel => (
                  <SignalChart 
                    key={channel}
                    channel={channel}
                    unit={channel.includes('Accel') ? 'g' : 'rad/s'}
                    timeValues={Array.from({ length: 100 }, (_, i) => i * 0.01)} // Placeholder time values
                    signalValues={Array.from({ length: 100 }, () => Math.random() - 0.5)} // Placeholder random signals
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 text-center italic">
                Tips: Click and drag on any chart to zoom. Click "Reset Zoom" to restore view.
              </p>
            </section>
          )}

          {/* Results Display */}
          {predictionResult && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <ResultsPanel result={predictionResult} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ExplanationPanel 
                  explanation={predictionResult.explanation} 
                  loading={false} 
                />
                <PatientCard patient={patientInfo} />
              </div>
            </div>
          )}

          {!parseResult && !predictionResult && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Activity className="h-12 w-12 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Ready for Analysis</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2">
                Please upload an observation file to begin visualizing smartwatch trajectory data and generating AI predictions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
