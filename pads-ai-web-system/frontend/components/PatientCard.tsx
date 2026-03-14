'use client';

import { PatientInfo } from '@/lib/types';
import { User, Dna, Ruler, Weight, UserCircle, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PatientCardProps {
  patient: PatientInfo | null;
}

export default function PatientCard({ patient }: PatientCardProps) {
  if (!patient) {
    return (
      <div className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 !bg-slate-50/50 dark:!bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <UserCircle className="h-10 w-10 text-slate-300" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-outfit font-black text-slate-400 uppercase tracking-widest">Metadata Empty</h3>
          <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">No clinical demographic payload detected in current diagnostic buffer.</p>
        </div>
      </div>
    );
  }

  const renderField = (label: string, value: string | number | null, Icon: any, unit?: string, i: number = 0) => (
    <div 
      className="flex items-center space-x-4 animate-in fade-in slide-in-from-left-4"
      style={{ animationDelay: `${i * 100}ms` }}
    >
      <div className="flex-shrink-0 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
          {value !== null && value !== undefined ? (
            <>
              {value}
              {unit && <span className="text-[10px] ml-1 opacity-40 font-black">{unit}</span>}
            </>
          ) : 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="glass-card p-10 rounded-[2.5rem] space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-900 dark:bg-white p-3 rounded-2xl">
            <UserCircle className="h-6 w-6 text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="text-2xl font-outfit font-black text-slate-900 dark:text-white tracking-tight">Clinical Profile</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Verified Subject Data</p>
          </div>
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-xl">
           <ShieldCheck className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-8 gap-x-6">
        {renderField('Diagnosis', patient.condition, Dna, undefined, 0)}
        {renderField('Subject Age', patient.age, User, 'YRS', 1)}
        {renderField('Biological', patient.gender, User, undefined, 2)}
        {renderField('Dominance', patient.handedness, User, undefined, 3)}
        {renderField('Height', patient.height, Ruler, 'CM', 4)}
        {renderField('Body Mass', patient.weight, Weight, 'KG', 5)}
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em]">
          PII REDACTION ACTIVE • SECURE RESEARCH BUFFER
        </p>
      </div>
    </div>
  );
}
