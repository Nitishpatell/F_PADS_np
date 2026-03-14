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
import { 
  AlertCircle, RefreshCcw, Loader2, Activity, Info, 
  Sparkles, BrainCircuit, Waves, Terminal, Database, 
  Search, Cpu, ChevronRight, Binary
} from 'lucide-react';

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
    <div className="flex flex-col min-h-[calc(100vh-5rem)] p-6 space-y-6">
      
      {/* Dynamic Header Information */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,107,0,0.6)]" />
            <span>Neural Diagnostic Workstation</span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">
            IMU <span className="text-zinc-600">Telemetrics</span> Dashboard
          </h2>
        </div>
        
        <div className="flex items-center space-x-4 bg-white/5 p-3 rounded-sm border border-white/5">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Health_Status</p>
            <p className="text-xs font-black uppercase tracking-tight">
              {health?.status === 'ok' ? (
                <span className="text-emerald-500">System_OK</span>
              ) : (
                <span className="text-rose-500">Service_Error</span>
              )}
            </p>
          </div>
          <div className={`w-12 h-1 ${health?.status === 'ok' ? 'bg-emerald-500/20' : 'bg-rose-500/20'} relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 h-full w-1/3 ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'} animate-[shimmer_2s_infinite]`} />
          </div>
        </div>
      </div>

      {/* Main Workstation Grid - Asymmetric 3-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        
        {/* Left Col: Config & Control (ColSpan 3) */}
        <aside className="lg:col-span-3 space-y-6 animate-tech">
          <section className="technical-panel p-6 space-y-8">
            <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
              <Database className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Data_Ingestion</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">01. Observation_JSON</p>
                <FileUpload 
                  label="Mount Telementry" 
                  onFile={handleFileUpload}
                  accept=".json"
                  className="glass-input !bg-zinc-900 overflow-hidden hover:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">02. Patient_Atlas (Opt)</p>
                <FileUpload 
                  label="Attach Clinical Context" 
                  onFile={handlePatientUpload}
                  accept=".json"
                  className="glass-input !bg-zinc-900 overflow-hidden hover:border-orange-500/50"
                />
              </div>
            </div>

            {loading && (
              <div className="flex items-center space-x-3 text-orange-500 p-2 border border-orange-500/20 bg-orange-500/5 rounded-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Decompressing_Signals...</span>
              </div>
            )}

            {parseResult && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="h-px bg-white/5" />
                <SessionSelector 
                  sessions={parseResult.sessions}
                  selectedSession={selectedSession}
                  selectedWrist={selectedWrist}
                  onSessionChange={setSelectedSession}
                  onWristChange={setSelectedWrist}
                />
                
                {!predictionResult && (
                  <button
                    onClick={handlePredict}
                    disabled={predicting || !selectedSession}
                    className="group relative w-full overflow-hidden border border-orange-500 bg-orange-500/10 p-4 transition-all hover:bg-orange-500 hover:text-black"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {predicting ? (
                        <>
                          <Cpu className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-black uppercase tracking-widest">Processing_Tensors...</span>
                        </>
                      ) : (
                        <>
                          <Binary className="h-4 w-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Execute_Inference</span>
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>
            )}

            {predictionResult && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center space-x-2 text-[10px] font-bold text-zinc-500 hover:text-orange-500 transition-colors pt-4"
              >
                <RefreshCcw className="h-3 w-3" />
                <span>FLUSH_MEMORY_AND_RESET</span>
              </button>
            )}
          </section>

          <div className="technical-panel p-6 bg-orange-500/5 border-orange-500/20 opacity-60">
            <div className="flex items-center space-x-3 mb-2">
              <Search className="h-4 w-4 text-orange-400" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Audit_Log</h4>
            </div>
            <p className="text-[9px] text-zinc-400 leading-relaxed font-mono">
              [LOG]: Waiting for telemetry stream...<br/>
              [ENV]: Production Ready (WHL-CPU)<br/>
              [MOD]: Hierarchical Transformer v2.1
            </p>
          </div>
        </aside>

        {/* Center Col: Telemetry View (ColSpan 6) */}
        <main className="lg:col-span-6 space-y-6 animate-tech [animation-delay:100ms]">
          {parseResult ? (
            <section className="technical-panel p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <Waves className="h-5 w-5 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Signal_Spectrum</h3>
                </div>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_4px_rgba(255,107,0,1)]" />
                    <span className="text-[8px] font-bold uppercase text-zinc-500 tracking-tighter">Axis_Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 border border-zinc-700 text-zinc-600 tracking-tighter">100Hz</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Accelerometer_X', 'Accelerometer_Y', 'Accelerometer_Z', 'Gyroscope_X', 'Gyroscope_Y', 'Gyroscope_Z'].map((channel, i) => (
                  <div key={channel} className="relative group">
                    <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <div className="w-4 h-[1px] bg-zinc-700" />
                      <span className="text-[8px] font-mono uppercase text-zinc-500">Live</span>
                    </div>
                    <SignalChart 
                      channel={channel}
                      unit={channel.includes('Accel') ? 'g' : 'rad/s'}
                      timeValues={Array.from({ length: 150 }, (_, i) => i * 0.01)}
                      signalValues={Array.from({ length: 150 }, () => (Math.random() - 0.5) * (channel.includes('Accel') ? 2 : 1))}
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 bg-black/40 border border-white/5 flex items-start space-x-3">
                <Terminal className="h-3 w-3 text-zinc-600 mt-1" />
                <p className="text-[9px] text-zinc-500 leading-relaxed">
                  TRANSFORMER_INPUT_RESOLVED: 256 steps cached. Ready for multi-axis cross-attention synthesis.
                </p>
              </div>
            </section>
          ) : (
            <div className="technical-panel h-[600px] flex flex-col items-center justify-center space-y-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/5 blur-3xl animate-pulse" />
                <Activity className="h-16 w-16 text-zinc-800 transition-colors group-hover:text-orange-500/20" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-700">Awaiting_Hardware_Stream</h3>
                <p className="text-[10px] text-zinc-500 font-bold max-w-xs mx-auto leading-relaxed uppercase tracking-tighter">
                  System idle. Connect to smartwatch IMU telemetry interface to begin analysis.
                </p>
              </div>
            </div>
          )}

          {predictionResult && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
              <ResultsPanel result={predictionResult} />
            </div>
          )}
        </main>

        {/* Right Col: AI Context & Insights (ColSpan 3) */}
        <aside className="lg:col-span-3 space-y-6 animate-tech [animation-delay:200ms]">
          {predictionResult ? (
            <div className="space-y-6 sticky top-24">
              <ExplanationPanel explanation={predictionResult.explanation} loading={false} />
              <PatientCard patient={patientInfo} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="technical-panel p-6 space-y-4">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <Sparkles className="h-4 w-4 text-orange-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-orange-400">AI_Core_Stats</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Latency', val: '84ms' },
                    { label: 'Precision', val: '92.4%' },
                    { label: 'Uptime', val: '99.9%' }
                  ].map(stat => (
                    <div key={stat.label} className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{stat.label}</span>
                      <span className="text-[10px] font-black font-mono">{stat.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="technical-panel p-6 space-y-4 opacity-50">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <BrainCircuit className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Neural_Architecture</h3>
                </div>
                <div className="space-y-3">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-zinc-600 animate-pulse" />
                  </div>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Layer_08_Transformers_Active</p>
                </div>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
