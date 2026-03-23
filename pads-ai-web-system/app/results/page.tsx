'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DIAGNOSIS_CONFIG } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('neuropd_result');
    if (!stored) {
      router.push('/analyze');
      return;
    }
    setResult(JSON.parse(stored));
    setMounted(true);
  }, [router]);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--text-muted)]">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result || !result.patient_id) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'white',
        textAlign: 'center',
        gap: '16px'
      }}>
        <h2>No results found</h2>
        <p style={{color: '#94A3B8'}}>
          Please upload sensor files to analyze
        </p>
        <a href="/analyze" style={{
          background: '#10B981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600'
        }}>
          Go to Analyze →
        </a>
      </div>
    );
  }

  try {

  // Safe diagnosis lookup (supports both short codes and full labels)
  const diagnosis = DIAGNOSIS_CONFIG[result?.diagnosis] || DIAGNOSIS_CONFIG.HC;

  const diagnosisColor = 
    result?.diagnosis === "HC" || 
    result?.diagnosis?.includes("Healthy") 
      ? "#10B981"  
    : result?.diagnosis === "PD" || 
      result?.diagnosis?.includes("Parkinson")
      ? "#EF4444"  
    : "#F59E0B";

  const riskLevel = 
    (result?.confidence ?? 0) < 0.5 
      ? { label: "Low Risk", color: "#10B981" }
    : (result?.confidence ?? 0) < 0.7 
      ? { label: "Moderate Risk", color: "#F59E0B" }
    : { label: "High Risk", color: "#EF4444" };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Results Dashboard</h1>
            <p className="text-[var(--text-secondary)]">
              Analysis for Patient {result?.patient_id ?? "N/A"} — {result?.task ?? "N/A"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/analyze" className="btn-outline text-sm px-6 py-2">
              New Analysis
            </Link>
            <button
              onClick={() => handleExportPDF(result)}
              className="btn-primary text-sm px-6 py-2"
              id="export-pdf-btn"
            >
              Download Report
            </button>
          </div>
        </div>

        {/* Top row: Diagnosis + Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {/* Diagnosis Badge */}
          <div
            className="card flex flex-col items-center justify-center py-8 space-y-4"
            style={{
              borderColor: `${diagnosis.color}33`,
              boxShadow: `0 0 30px -8px ${diagnosis.color}30`,
            }}
          >
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">AI Diagnosis</p>
            <div className={diagnosis.bgClass} style={{ color: diagnosisColor }}>
              {diagnosis.label}
            </div>
            <div className="text-xs text-[var(--text-muted)] space-y-1 text-center">
              <p>Prediction confidence: {((result?.confidence ?? 0) * 100).toFixed(1)}%</p>
              <p style={{ color: riskLevel.color }} className="font-semibold mt-2">
                ● {riskLevel.label}
              </p>
            </div>
          </div>

          {/* Confidence Gauge */}
          <div className="card flex flex-col items-center justify-center py-8">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Confidence Score</p>
            <ConfidenceGauge value={result?.confidence ?? 0} color={diagnosis.color} />
          </div>

          {/* Metadata */}
          <div className="card py-8 space-y-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Analysis Metadata</p>
            <div className="space-y-3">
              {[
                { label: 'Patient ID', value: result?.patient_id ?? 'N/A' },
                { label: 'Task', value: result?.task ?? 'N/A' },
                { label: 'Left File', value: result?.left_file ?? 'N/A' },
                { label: 'Right File', value: result?.right_file ?? 'N/A' },
                { label: 'Windows Analyzed', value: result?.windows_analysed?.toString() ?? 'N/A' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-xs font-medium text-white truncate ml-4 max-w-[200px]" title={item.value}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Probability Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <ProbabilityBar
            title="HC vs PD (Task 1)"
            labels={['HC (Healthy)', "PD (Parkinson's)"]}
            values={[result?.hc_prob ?? 0, result?.pd_prob ?? 0]}
            colors={['#22C55E', '#EF4444']}
          />
          <ProbabilityBar
            title="PD vs DD (Task 2)"
            labels={["PD (Parkinson's)", 'DD (Differential)']}
            values={[result?.pd_prob ?? 0, result?.dd_prob ?? 0]}
            colors={['#EF4444', '#F97316']}
          />
        </div>

        {/* Key Motion Features */}
        {result?.features && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="card space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tremor Power</h4>
              <p className="text-2xl font-black text-white">
                {result?.features?.tremor_power ?? "N/A"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">3-8 Hz band power</p>
            </div>
            <div className="card space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Jerk RMS</h4>
              <p className="text-2xl font-black text-white">
                {result?.features?.jerk_rms ?? "N/A"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Movement smoothness</p>
            </div>
            <div className="card space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Signal Variability</h4>
              <p className="text-2xl font-black text-white">
                {result?.features?.std_dev ?? "N/A"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Motion variability</p>
            </div>
          </div>
        )}

        {/* Signal Visualization */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Signal Visualization</h3>
          <SignalVisualization
            leftData={result?.signal_preview?.left ?? []}
            rightData={result?.signal_preview?.right ?? []}
          />
        </div>

        {/* AI Clinical Report */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Clinical Analysis</h3>
                <p className="text-xs text-[var(--text-muted)]">Generated by Gemini AI</p>
              </div>
            </div>
            <CopyReportButton text={result?.gemini_report ?? ''} />
          </div>

          <div className="prose prose-invert prose-sm max-w-none">
            <div
              className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap"
              style={{ lineHeight: '1.8' }}
            >
              {result?.gemini_report ?? 'No report available.'}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-[var(--warning)]/5 border border-[var(--warning)]/20">
            <p className="text-xs text-[var(--warning)]">
              ⚠ <strong>Disclaimer:</strong> This AI analysis is for research and screening purposes only.
              It does not constitute a medical diagnosis. Consult a qualified neurologist for clinical decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error(error);
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-xl text-white">Results format changed or data is incomplete.</p>
        <Link href="/analyze" className="text-[var(--teal)] hover:underline">
          Go back to Analysis
        </Link>
      </div>
    );
  }
}

// ---- Copy Report Button ----
function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      id="copy-report-btn"
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 border ${
        copied
          ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]'
          : 'border-[var(--border)] bg-[var(--surface-light)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--teal)]'
      }`}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy Report</span>
        </>
      )}
    </button>
  );
}

// ---- Confidence Gauge ----
function ConfidenceGauge({ value, color }: { value: number; color: string }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - animatedValue * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        {/* Background */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="var(--surface-light)"
          strokeWidth="10"
        />
        {/* Value */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-circle"
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{(animatedValue * 100).toFixed(1)}%</span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Confidence</span>
      </div>
    </div>
  );
}

// ---- Probability Bar ----
function ProbabilityBar({
  title,
  labels,
  values,
  colors,
}: {
  title: string;
  labels: string[];
  values: [number, number];
  colors: [string, string];
}) {
  return (
    <div className="card space-y-4">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{title}</h4>

      {/* Split bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-[var(--surface-light)]">
        <div
          className="prob-bar"
          style={{ width: `${values[0] * 100}%`, backgroundColor: colors[0] }}
        />
        <div
          className="prob-bar"
          style={{ width: `${values[1] * 100}%`, backgroundColor: colors[1] }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} />
            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            <span className="text-xs font-bold text-white">{(values[i] * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Signal Chart (all 6 channels, Acc + Gyro tabs) ----
function SignalVisualization({ leftData, rightData }: { leftData: number[][]; rightData: number[][] }) {
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const [selectedGroup, setSelectedGroup] = useState<'acc' | 'gyro'>('acc');

  const data = selectedSide === 'left' ? leftData : rightData;

  const SENSOR_LABELS = ['AccX', 'AccY', 'AccZ', 'GyrX', 'GyrY', 'GyrZ'];
  const ACC_COLORS  = ['#0D9488', '#14B8A6', '#06B6D4'];
  const GYRO_COLORS = ['#EF4444', '#F97316', '#EAB308'];

  const activeLabels = selectedGroup === 'acc' ? SENSOR_LABELS.slice(0, 3) : SENSOR_LABELS.slice(3);
  const activeColors = selectedGroup === 'acc' ? ACC_COLORS : GYRO_COLORS;

  const chartData = useMemo(() => {
    // Downsample to max 200 points
    if (!data || !data.length) return [];
    const step = Math.max(1, Math.floor(data.length / 200));
    return data
      .filter((_, i) => i % step === 0)
      .map((row, i) => {
        const point: Record<string, number> = { index: i * step };
        // row might have 6 or 7 values (with/without time)
        const sensorValues = row.length === 7 ? row.slice(1) : row;
        sensorValues.forEach((v, j) => {
          if (j < SENSOR_LABELS.length) {
            point[SENSOR_LABELS[j]] = v;
          }
        });
        return point;
      });
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Side toggle */}
        <div className="flex items-center space-x-2">
          {(['left', 'right'] as const).map(side => (
            <button
              key={side}
              onClick={() => setSelectedSide(side)}
              className={selectedSide === side ? 'tab-btn-active' : 'tab-btn'}
            >
              {side === 'left' ? 'Left Wrist' : 'Right Wrist'}
            </button>
          ))}
        </div>

        {/* Sensor group toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedGroup('acc')}
            className={selectedGroup === 'acc' ? 'tab-btn-active' : 'tab-btn'}
            id="acc-tab"
          >
            Accelerometer
          </button>
          <button
            onClick={() => setSelectedGroup('gyro')}
            className={selectedGroup === 'gyro' ? 'tab-btn-active' : 'tab-btn'}
            id="gyro-tab"
          >
            Gyroscope
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="index"
                stroke="var(--text-muted)"
                tick={{ fontSize: 10 }}
                label={{ value: 'Sample', position: 'bottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }}
              />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {activeLabels.map((label, i) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={activeColors[i]}
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            Signal preview not available.
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Showing {selectedGroup === 'acc' ? 'Accelerometer' : 'Gyroscope'} channels (AccX/Y/Z or GyrX/Y/Z) •{' '}
        {selectedSide === 'left' ? 'Left' : 'Right'} Wrist • downsampled to ≤200 points
      </p>
    </div>
  );
}

// ---- PDF Export (improved formatting) ----
function handleExportPDF(result: any) {
  const diagnosis = DIAGNOSIS_CONFIG[result?.diagnosis] || DIAGNOSIS_CONFIG.HC;
  const now = new Date().toISOString();
  const separator = '─'.repeat(52);

  const content = \`
╔══════════════════════════════════════════════════════╗
║          NeuroPD — CLINICAL ANALYSIS REPORT          ║
╚══════════════════════════════════════════════════════╝

Generated : \${now}
System    : NeuroPD Transformer v1.0 • PADS Dataset
 
\${separator}
PATIENT INFORMATION
\${separator}
Patient ID       : \${result?.patient_id ?? 'N/A'}
Task Performed   : \${result?.task ?? 'N/A'}
Windows Analyzed : \${result?.windows_analysed ?? 'N/A'}
Left Wrist File  : \${result?.left_file ?? 'N/A'}
Right Wrist File : \${result?.right_file ?? 'N/A'}

\${separator}
PRIMARY DIAGNOSIS
\${separator}
Diagnosis   : \${diagnosis.label} (\${result?.diagnosis ?? 'Unknown'})
Confidence  : \${((result?.confidence ?? 0) * 100).toFixed(1)}%

\${separator}
PROBABILITY ANALYSIS
\${separator}
Task 1 — Healthy Control vs Parkinson's Disease:
  HC (Healthy Control)    : \${((result?.hc_prob ?? 0) * 100).toFixed(2)}%
  PD (Parkinson's Disease): \${((result?.pd_prob ?? 0) * 100).toFixed(2)}%

Task 2 — Parkinson's Disease vs Differential Diagnosis:
  PD (Parkinson's Disease): \${((result?.pd_prob ?? 0) * 100).toFixed(2)}%
  DD (Differential Diag.) : \${((result?.dd_prob ?? 0) * 100).toFixed(2)}%

\${separator}
AI CLINICAL ANALYSIS  (Gemini AI)
\${separator}
\${result?.gemini_report ?? 'No report provided by the analysis system.'}

\${separator}
DISCLAIMER
\${separator}
This AI analysis is for RESEARCH AND SCREENING PURPOSES ONLY.
It does NOT constitute a medical diagnosis. Consult a qualified
neurologist for all clinical decisions.

NeuroPD Transformer v1.0 — Powered by PADS Dataset
Report generated: \${now}
  \`.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`NeuroPD_Report_\${result?.patient_id ?? 'Unknown'}_{\${result?.task ?? 'Unknown'}_\${new Date().toISOString().split('T')[0]}.txt\`;
  a.click();
  URL.revokeObjectURL(url);
}
