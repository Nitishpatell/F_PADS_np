'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SensorPredictResult, DIAGNOSIS_CONFIG, DiagnosisLabel } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<SensorPredictResult | null>(null);
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

  if (!result || !mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--text-muted)]">Loading results...</p>
        </div>
      </div>
    );
  }

  // Safe diagnosis lookup (supports both short codes and full labels)
  const diagnosis = DIAGNOSIS_CONFIG[result.prediction] || DIAGNOSIS_CONFIG.HC;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Results Dashboard</h1>
            <p className="text-[var(--text-secondary)]">
              Analysis for Patient {result.metadata.patient_id} — {result.metadata.task}
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
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Top row: Diagnosis + Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {/* Diagnosis Badge */}
          <div className="card flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">AI Diagnosis</p>
            <div className={diagnosis.bgClass}>
              {diagnosis.label}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Prediction confidence: {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>

          {/* Confidence Gauge */}
          <div className="card flex flex-col items-center justify-center py-8">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Confidence Score</p>
            <ConfidenceGauge value={result.confidence} color={diagnosis.color} />
          </div>

          {/* Metadata */}
          <div className="card py-8 space-y-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Analysis Metadata</p>
            <div className="space-y-3">
              {[
                { label: 'Patient ID', value: result.metadata.patient_id },
                { label: 'Task', value: result.metadata.task },
                { label: 'Left File', value: result.metadata.left_file },
                { label: 'Right File', value: result.metadata.right_file },
                { label: 'Windows Analyzed', value: result.metadata.windows_analysed.toString() },
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
            labels={['HC (Healthy)', 'PD (Parkinson\'s)']}
            values={result.probabilities.hc_vs_pd}
            colors={['#22C55E', '#EF4444']}
          />
          <ProbabilityBar
            title="PD vs DD (Task 2)"
            labels={['PD (Parkinson\'s)', 'DD (Differential)']}
            values={result.probabilities.pd_vs_dd}
            colors={['#EF4444', '#F97316']}
          />
        </div>

        {/* Signal Visualization */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Signal Visualization</h3>
          <SignalVisualization
            leftData={result.signal_preview.left}
            rightData={result.signal_preview.right}
          />
        </div>

        {/* AI Clinical Report */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center space-x-3 mb-6">
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

          <div className="prose prose-invert prose-sm max-w-none">
            <div
              className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap"
              style={{ lineHeight: '1.8' }}
            >
              {result.report}
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

// ---- Signal Chart ----
function SignalVisualization({ leftData, rightData }: { leftData: number[][]; rightData: number[][] }) {
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const data = selectedSide === 'left' ? leftData : rightData;

  const SENSOR_LABELS = ['AccX', 'AccY', 'AccZ', 'GyrX', 'GyrY', 'GyrZ'];
  const COLORS = ['#0D9488', '#14B8A6', '#06B6D4', '#EF4444', '#F97316', '#EAB308'];

  const chartData = useMemo(() => {
    // Downsample to max 200 points
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
      {/* Side toggle */}
      <div className="flex items-center space-x-2">
        {(['left', 'right'] as const).map(side => (
          <button
            key={side}
            onClick={() => setSelectedSide(side)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSide === side
                ? 'bg-[var(--teal)] text-white'
                : 'bg-[var(--surface-light)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {side === 'left' ? 'Left Wrist' : 'Right Wrist'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
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
            {SENSOR_LABELS.slice(0, 3).map((label, i) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={COLORS[i]}
                dot={false}
                strokeWidth={1.5}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- PDF Export (simple) ----
function handleExportPDF(result: SensorPredictResult) {
  const diagnosis = DIAGNOSIS_CONFIG[result.prediction] || DIAGNOSIS_CONFIG.HC;
  const content = `
NEUROPD — CLINICAL ANALYSIS REPORT
${'='.repeat(50)}

DIAGNOSIS: ${diagnosis.label} (${result.prediction})
CONFIDENCE: ${(result.confidence * 100).toFixed(1)}%

PATIENT: ${result.metadata.patient_id}
TASK: ${result.metadata.task}
WINDOWS ANALYZED: ${result.metadata.windows_analysed}

PROBABILITY ANALYSIS
--------------------
HC vs PD:
  HC: ${(result.probabilities.hc_vs_pd[0] * 100).toFixed(1)}%
  PD: ${(result.probabilities.hc_vs_pd[1] * 100).toFixed(1)}%

PD vs DD:
  PD: ${(result.probabilities.pd_vs_dd[0] * 100).toFixed(1)}%
  DD: ${(result.probabilities.pd_vs_dd[1] * 100).toFixed(1)}%

FILES:
  Left:  ${result.metadata.left_file}
  Right: ${result.metadata.right_file}

AI CLINICAL REPORT
------------------
${result.report}

DISCLAIMER
----------
This AI analysis is for research and screening purposes only.
It does not constitute a medical diagnosis. Consult a qualified
neurologist for clinical decisions.

Generated by NeuroPD — ${new Date().toISOString()}
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NeuroPD_Report_${result.metadata.patient_id}_${result.metadata.task}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
