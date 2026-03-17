'use client';

import { PredictionResult } from '@/lib/types';
import { AlertCircle, CheckCircle2, ChevronRight, Binary, Fingerprint, Activity } from 'lucide-react';

interface ResultsPanelProps {
  result: PredictionResult;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const isLowConfidence = result.confidence_task1 < 0.5 || result.confidence_task2 < 0.5;

  return (
    <div className="technical-panel bg-black/40 overflow-hidden animate-in zoom-in-95 duration-700">
      {/* Header with technical metadata */}
      <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <Binary className="h-4 w-4 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em]">Diagnostic_Payload_Results</h2>
        </div>
        <div className="flex items-center space-x-6 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center space-x-1"><span className="text-zinc-700">SES:</span> <span className="text-zinc-300">{result.session}</span></div>
          <div className="flex items-center space-x-1"><span className="text-zinc-700">LOC:</span> <span className="text-zinc-300">{result.wrist}</span></div>
          <div className="flex items-center space-x-1"><span className="text-zinc-700">WND:</span> <span className="text-zinc-300">{result.windows_analysed}</span></div>
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* Task 1: HC vs PD */}
        <div className="relative space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-orange-500/80 uppercase tracking-[0.2em]">01. Primary_Screening</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center">
                {result.task1_label === 'HC' ? (
                  <span className="text-emerald-500">Healthy_Control</span>
                ) : (
                  <span className="text-orange-500 underline decoration-orange-500/20 underline-offset-8">Parkinson_Disease</span>
                )}
                <div className="ml-4 h-[1px] w-8 bg-zinc-800" />
              </h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black font-mono tracking-tighter">{(result.confidence_task1 * 100).toFixed(1)}%</p>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Inference_Conf</p>
            </div>
          </div>
          
          <div className="relative h-6 bg-white/5 p-1 rounded-sm flex overflow-hidden">
            <div 
              className="h-full bg-emerald-600 transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden" 
              style={{ width: `${result.task1_probabilities.HC * 100}%` }}
            >
              <span className="text-[8px] font-black text-white px-2 uppercase tracking-tighter">HC</span>
            </div>
            <div 
              className="h-full bg-orange-600 transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden border-l border-black/40" 
              style={{ width: `${result.task1_probabilities.PD * 100}%` }}
            >
              <span className="text-[8px] font-black text-white px-2 uppercase tracking-tighter">PD</span>
            </div>
          </div>
        </div>

        {/* Task 2: PD vs DD */}
        <div className="relative space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">02. Differential_Target</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center">
                {result.task2_label === 'PD' ? (
                  <span className="text-orange-500">Class_PD</span>
                ) : (
                  <span className="text-zinc-100">Class_DD</span>
                )}
                <div className="ml-4 h-5 w-[1px] bg-zinc-800 rotate-12" />
              </h3>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black font-mono tracking-tighter">{(result.confidence_task2 * 100).toFixed(1)}%</p>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Classifier_Output</p>
            </div>
          </div>
          
          <div className="relative h-6 bg-white/5 p-1 rounded-sm flex overflow-hidden">
            <div 
              className="h-full bg-orange-800 transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden" 
              style={{ width: `${result.task2_probabilities.PD * 100}%` }}
            >
              <span className="text-[8px] font-black text-white/50 px-2 uppercase tracking-tighter">PD</span>
            </div>
            <div 
              className="h-full bg-white/10 transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden border-l border-white/5" 
              style={{ width: `${result.task2_probabilities.DD * 100}%` }}
            >
              <span className="text-[8px] font-black text-white px-2 uppercase tracking-tighter">DD</span>
            </div>
          </div>
        </div>

        {isLowConfidence && (
          <div className="border border-orange-500/20 bg-orange-500/5 p-4 flex items-start space-x-3">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-[10px] text-orange-400/80 leading-relaxed font-bold uppercase tracking-tight">
              WARNING: LOW CONFIDENCE THRESHOLD DETECTED. ANALYTICAL VARIANCE EXCEEDS STANDARD PARAMETERS. CLINICAL VERIFICATION MANDATORY.
            </p>
          </div>
        )}
      </div>

      {/* Footer Decoration */}
      <div className="bg-black/40 px-6 py-3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-zinc-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1"><Activity className="h-3 w-3" /> <span>Real-time Synthesis</span></div>
          <div className="flex items-center space-x-1"><Fingerprint className="h-3 w-3" /> <span>Identity_Masked</span></div>
        </div>
        <span>HASH_V2_412_A</span>
      </div>
    </div>
  );
}
