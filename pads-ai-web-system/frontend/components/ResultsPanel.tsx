'use client';

import { PredictionResult } from '@/lib/types';
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResultsPanelProps {
  result: PredictionResult;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const isLowConfidence = result.confidence_task1 < 0.5 || result.confidence_task2 < 0.5;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Analysis Results</h2>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>Session: <span className="font-semibold">{result.session}</span></span>
          <span>Wrist: <span className="font-semibold">{result.wrist}</span></span>
          <span>Windows: <span className="font-semibold">{result.windows_analysed}</span></span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Task 1: HC vs PD */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task 1: Screening</p>
              <h3 className="text-xl font-bold flex items-center mt-1">
                {result.task1_label === 'HC' ? 'Healthy Control' : "Parkinson's Disease"}
                {result.task1_label === 'HC' ? (
                  <CheckCircle2 className="ml-2 h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="ml-2 h-5 w-5 text-amber-500" />
                )}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900">{(result.confidence_task1 * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400 font-medium">Confidence</p>
            </div>
          </div>
          
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-green-500 transition-all" 
              style={{ width: `${result.task1_probabilities.HC * 100}%` }}
              title={`HC: ${(result.task1_probabilities.HC * 100).toFixed(1)}%`}
            />
            <div 
              className="h-full bg-amber-500 transition-all" 
              style={{ width: `${result.task1_probabilities.PD * 100}%` }}
              title={`PD: ${(result.task1_probabilities.PD * 100).toFixed(1)}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
            <span>Healthy (HC)</span>
            <span>Parkinson's (PD)</span>
          </div>
        </div>

        {/* Task 2: PD vs DD */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task 2: Differential Diagnosis</p>
              <h3 className="text-xl font-bold flex items-center mt-1">
                {result.task2_label === 'PD' ? "Parkinson's Disease" : 'Differential Diagnosis'}
                <ChevronRight className="ml-1 h-5 w-5 text-gray-300" />
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900">{(result.confidence_task2 * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400 font-medium">Confidence</p>
            </div>
          </div>
          
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-amber-500 transition-all" 
              style={{ width: `${result.task2_probabilities.PD * 100}%` }}
              title={`PD: ${(result.task2_probabilities.PD * 100).toFixed(1)}%`}
            />
            <div 
              className="h-full bg-blue-500 transition-all" 
              style={{ width: `${result.task2_probabilities.DD * 100}%` }}
              title={`DD: ${(result.task2_probabilities.DD * 100).toFixed(1)}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
            <span>Parkinson's (PD)</span>
            <span>Differential (DD)</span>
          </div>
        </div>

        {isLowConfidence && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Low confidence result — clinical review recommended. Results should be interpreted with caution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
