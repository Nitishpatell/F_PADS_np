'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { VALID_TASKS } from '@/lib/types';
import type { TaskName, ApiError, SensorPredictResult } from '@/lib/types';

// ---- Filename parsing ----
const FILENAME_PATTERN = /^(\d+)_([A-Za-z]+)_(Left|Right)Wrist\.(txt|csv)$/;

interface FileInfo {
  file: File;
  patientId: string;
  task: string;
  side: 'Left' | 'Right';
  rows: number;
  cols: number;
  preview: string[][];
  columns: string[];
}

function parseFileName(name: string): { patientId: string; task: string; side: 'Left' | 'Right' } | null {
  const m = name.match(FILENAME_PATTERN);
  if (!m) return null;
  return { patientId: m[1], task: m[2], side: m[3] as 'Left' | 'Right' };
}

async function readFilePreview(file: File): Promise<{ rows: number; cols: number; preview: string[][]; columns: string[] }> {
  const text = await file.text();
  const lines = text.trim().split('\n').filter(Boolean);
  const sep = lines[0]?.includes('\t') ? '\t' : ',';
  const allRows = lines.map(l => l.split(sep));
  const cols = allRows[0]?.length ?? 0;

  // Determine columns
  const sensorCols = cols === 7
    ? ['Time', 'AccX', 'AccY', 'AccZ', 'GyrX', 'GyrY', 'GyrZ']
    : ['AccX', 'AccY', 'AccZ', 'GyrX', 'GyrY', 'GyrZ'];

  const preview = allRows.slice(0, 5).map(r => r.map(v => {
    const n = parseFloat(v);
    return isNaN(n) ? v : n.toFixed(6);
  }));

  return { rows: allRows.length, cols, preview, columns: sensorCols };
}

// ---- Loading stages ----
const LOADING_STAGES = [
  { label: 'Preprocessing signals...', icon: '📡' },
  { label: 'Applying filters...', icon: '🔬' },
  { label: 'Extracting biomechanical features...', icon: '🧠' },
  { label: 'Generating clinical report...', icon: '📋' },
];

// ---- File size warning threshold: 25 MB ----
const FILE_SIZE_WARNING_MB = 25;

export default function AnalyzePage() {
  const router = useRouter();
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  const [leftFile, setLeftFile] = useState<FileInfo | null>(null);
  const [rightFile, setRightFile] = useState<FileInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskName | ''>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [largeFileWarning, setLargeFileWarning] = useState<string | null>(null);

  // ---- File handlers ----
  const handleFileDrop = useCallback(async (side: 'Left' | 'Right', file: File | null) => {
    if (!file) {
      if (side === 'Left') setLeftFile(null);
      else setRightFile(null);
      return;
    }

    // Large file warning
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > FILE_SIZE_WARNING_MB) {
      setLargeFileWarning(`${side} file is ${sizeMB.toFixed(1)} MB — larger files may take longer to process.`);
    } else {
      setLargeFileWarning(null);
    }

    const parsed = parseFileName(file.name);
    if (!parsed) {
      setErrors(prev => [...prev.filter(e => !e.includes(side)), `Invalid ${side} wrist filename. Expected: {PatientID}_{Task}_{Side}Wrist.txt`]);
      return;
    }
    if (parsed.side !== side) {
      setErrors(prev => [...prev.filter(e => !e.includes(side)), `Expected ${side}Wrist file, got ${parsed.side}Wrist`]);
      return;
    }

    const preview = await readFilePreview(file);
    if (preview.cols !== 6 && preview.cols !== 7) {
      setErrors(prev => [...prev.filter(e => !e.includes(side)), `Invalid sensor format in ${side} file: expected 6 or 7 columns, got ${preview.cols}`]);
      return;
    }

    setErrors(prev => prev.filter(e => !e.includes(side)));
    const info: FileInfo = {
      file,
      patientId: parsed.patientId,
      task: parsed.task,
      side: parsed.side,
      ...preview,
    };

    if (side === 'Left') setLeftFile(info);
    else setRightFile(info);
  }, []);

  // ---- Validation ----
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (leftFile && rightFile && leftFile.patientId !== rightFile.patientId) {
      errs.push(`Files must belong to same patient (Left: ${leftFile.patientId}, Right: ${rightFile.patientId})`);
    }
    if (selectedTask && leftFile && leftFile.task !== selectedTask) {
      errs.push(`Left file task '${leftFile.task}' doesn't match selected task '${selectedTask}'`);
    }
    if (selectedTask && rightFile && rightFile.task !== selectedTask) {
      errs.push(`Right file task '${rightFile.task}' doesn't match selected task '${selectedTask}'`);
    }
    return errs;
  }, [leftFile, rightFile, selectedTask]);

  const allErrors = [...errors, ...validationErrors];
  const canAnalyze = leftFile && rightFile && selectedTask && allErrors.length === 0;

  // ---- Submit ----
  const handleAnalyze = async () => {
    if (!canAnalyze || !leftFile || !rightFile) return;

    setLoading(true);
    setApiError(null);
    setLoadingStage(0);

    // Simulate loading stages
    const stageTimer = setInterval(() => {
      setLoadingStage(prev => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 1500);

    try {
      const result: SensorPredictResult = await api.predictSensor(
        leftFile.file,
        rightFile.file,
        selectedTask
      );

      clearInterval(stageTimer);

      // Store result in sessionStorage and navigate
      sessionStorage.setItem('neuropd_result', JSON.stringify(result));
      router.push('/results');
    } catch (err: unknown) {
      clearInterval(stageTimer);
      const apiErr = err as ApiError;
      setApiError(apiErr.detail || apiErr.error || 'Prediction failed. Please check your data and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-3xl font-bold text-white mb-3">Data Input</h1>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Upload synchronized Left and Right wrist sensor data.
            Both files must belong to the same patient and task.
          </p>
        </div>

        {/* File Naming Guide toggle */}
        <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <button
            onClick={() => setShowGuide((prev) => !prev)}
            className="flex items-center space-x-2 text-sm text-[var(--teal-light)] hover:text-white transition-colors mx-auto"
            id="file-guide-toggle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>{showGuide ? 'Hide' : 'How should I name my files?'}</span>
          </button>

          {showGuide && (
            <div className="file-guide mt-3 max-w-xl mx-auto">
              <p className="font-semibold text-white text-sm">Required filename format:</p>
              <code className="block bg-[var(--navy-dark)] rounded-lg px-4 py-2 text-[var(--teal-light)] text-xs font-mono mt-1">
                {'{PatientID}_{Task}_{Side}Wrist.{ext}'}
              </code>
              <div className="space-y-1 text-xs mt-2">
                <p>• <span className="text-white font-medium">PatientID</span> — a number, e.g. <code className="text-[var(--teal-light)]">035</code></p>
                <p>• <span className="text-white font-medium">Task</span> — one of the 10 supported tasks, e.g. <code className="text-[var(--teal-light)]">TouchNose</code></p>
                <p>• <span className="text-white font-medium">Side</span> — either <code className="text-[var(--teal-light)]">LeftWrist</code> or <code className="text-[var(--teal-light)]">RightWrist</code></p>
                <p>• <span className="text-white font-medium">Extension</span> — <code className="text-[var(--teal-light)]">.txt</code> or <code className="text-[var(--teal-light)]">.csv</code></p>
              </div>
              <p className="text-xs mt-2 border-t border-[var(--border)] pt-2">
                <span className="text-white font-medium">Example:</span>{' '}
                <code className="text-[var(--teal-light)]">035_TouchNose_LeftWrist.txt</code>
              </p>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Left Wrist */}
          <UploadBox
            side="Left"
            fileInfo={leftFile}
            inputRef={leftInputRef}
            onFile={(f) => handleFileDrop('Left', f)}
            onClear={() => { setLeftFile(null); setErrors(prev => prev.filter(e => !e.includes('Left'))); }}
          />

          {/* Right Wrist */}
          <UploadBox
            side="Right"
            fileInfo={rightFile}
            inputRef={rightInputRef}
            onFile={(f) => handleFileDrop('Right', f)}
            onClear={() => { setRightFile(null); setErrors(prev => prev.filter(e => !e.includes('Right'))); }}
          />
        </div>

        {/* Large file warning */}
        {largeFileWarning && (
          <div className="rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 p-3 flex items-center space-x-2 animate-fade-in">
            <span className="text-[var(--warning)]">⚠</span>
            <span className="text-sm text-[var(--warning)]">{largeFileWarning}</span>
          </div>
        )}

        {/* Task Selection */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <label className="block text-sm font-semibold text-white mb-3">Task Selection <span className="text-[var(--danger)]">*</span></label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value as TaskName)}
            className="input-field cursor-pointer"
            id="task-select"
          >
            <option value="">— Select a task —</option>
            {VALID_TASKS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {leftFile && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Detected task from filename: <span className="text-[var(--teal-light)] font-medium">{leftFile.task}</span>
            </p>
          )}
        </div>

        {/* Data Preview */}
        {(leftFile || rightFile) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {leftFile && <DataPreview info={leftFile} />}
            {rightFile && <DataPreview info={rightFile} />}
          </div>
        )}

        {/* Errors */}
        {allErrors.length > 0 && (
          <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-4 space-y-2 animate-fade-in">
            {allErrors.map((err, i) => (
              <div key={i} className="flex items-start space-x-2">
                <span className="text-[var(--danger)] mt-0.5">✕</span>
                <span className="text-sm text-[var(--danger)]">{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-4 animate-fade-in">
            <div className="flex items-start space-x-2">
              <span className="text-[var(--danger)] mt-0.5">⚠</span>
              <span className="text-sm text-[var(--danger)]">{apiError}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card space-y-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-white">Processing Analysis...</h3>

            {/* Stage dots progress */}
            <div className="flex items-center justify-between mb-2">
              {LOADING_STAGES.map((_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      i < loadingStage
                        ? 'border-[var(--success)] bg-[var(--success)]/20 text-[var(--success)]'
                        : i === loadingStage
                        ? 'border-[var(--teal)] bg-[var(--teal)]/20 text-[var(--teal-light)] animate-pulse'
                        : 'border-[var(--border)] bg-transparent text-[var(--text-muted)]'
                    }`}
                  >
                    {i < loadingStage ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  {i < LOADING_STAGES.length - 1 && (
                    <div className="hidden" />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {LOADING_STAGES.map((stage, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-3 transition-opacity duration-500 ${i <= loadingStage ? 'opacity-100' : 'opacity-20'}`}
                >
                  <span className="text-lg">{stage.icon}</span>
                  <span className={`text-sm ${i === loadingStage ? 'text-[var(--teal-light)] font-semibold loading-step' : i < loadingStage ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                    {i < loadingStage ? '✓ ' : ''}{stage.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-light)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--teal)] to-[var(--teal-light)] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((loadingStage + 1) / LOADING_STAGES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Analyze Button */}
        {!loading && (
          <div className="text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="btn-primary text-base px-16 py-4"
              id="analyze-button"
            >
              Analyze Data →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function UploadBox({ side, fileInfo, inputRef, onFile, onClear }: {
  side: 'Left' | 'Right';
  fileInfo: FileInfo | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | null) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{side} Wrist Data</h3>
        {fileInfo && (
          <button onClick={onClear} className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
            Remove
          </button>
        )}
      </div>

      {!fileInfo ? (
        <div
          className={`upload-zone ${dragOver ? 'active' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-light)] flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Drag &amp; drop or <span className="text-[var(--teal-light)] font-medium">browse</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              e.g. 035_TouchNose_{side}Wrist.txt
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg bg-[var(--teal)]/5 border border-[var(--teal)]/20 p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[var(--success)]">✓</span>
            <span className="text-sm font-medium text-white truncate">{fileInfo.file.name}</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)]">
            <span>Patient: <span className="text-[var(--teal-light)] font-medium">{fileInfo.patientId}</span></span>
            <span>Task: <span className="text-[var(--teal-light)] font-medium">{fileInfo.task}</span></span>
            <span>{fileInfo.rows.toLocaleString()} rows</span>
            <span>{fileInfo.cols} cols</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPreview({ info }: { info: FileInfo }) {
  return (
    <div className="card">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
        {info.side} Wrist Preview — {info.file.name}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {info.columns.map(col => (
                <th key={col} className="text-left py-2 px-2 text-[var(--teal-light)] font-semibold border-b border-[var(--border)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {info.preview.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                {row.map((val, j) => (
                  <td key={j} className="py-1.5 px-2 text-[var(--text-secondary)] font-mono">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-2">
        Showing first 5 of {info.rows.toLocaleString()} rows • {info.columns.length} columns detected
      </p>
    </div>
  );
}
