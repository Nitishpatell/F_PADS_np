'use client';

import { Sparkles, Loader2, FileText, Globe, Shield } from 'lucide-react';

interface ExplanationPanelProps {
  explanation: string;
  loading: boolean;
}

export default function ExplanationPanel({ explanation, loading }: ExplanationPanelProps) {
  return (
    <div className="technical-panel bg-black/40 flex flex-col h-full animate-in slide-in-from-right-4 duration-700">
      <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em]">Neural_Narrative_Synthesis</h2>
        </div>
        <div className="px-2 py-0.5 border border-white/10 rounded-sm">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Model: Gemini_2.0_Pro</span>
        </div>
      </div>

      <div className="p-8 flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/20 blur-2xl animate-pulse" />
              <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] animate-pulse">Decoding_Neural_Weights...</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-orange-500/50 via-transparent to-transparent" />
            <div className="prose prose-invert max-w-none">
              <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono selection:bg-orange-500/40">
                {explanation || "DIAGNOSTIC_IDLE: Awaiting prediction payload for interpretation synthesis..."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5">
        <div className="flex flex-wrap items-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
          <div className="flex items-center space-x-2">
            <Shield className="h-3 w-3" />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">Privacy_Encrypted</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="h-3 w-3" />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">Distributed_Inference</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-3 w-3" />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">Research_Access_Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
