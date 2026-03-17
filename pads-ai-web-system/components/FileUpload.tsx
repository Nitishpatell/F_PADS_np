'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileJson, Cpu, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileUploadProps {
  label: string;
  onFile: (file: File | null) => void;
  accept?: string;
  error?: string;
  className?: string;
}

export default function FileUpload({ label, onFile, accept = '.json', error: externalError, className }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [innerError, setInnerError] = useState<string | null>(null);

  const validateAndSetFile = useCallback((file: File | null) => {
    setInnerError(null);
    if (!file) {
      setFileName(null);
      onFile(null);
      return;
    }

    if (accept === '.json' && !file.name.toLowerCase().endsWith('.json')) {
      setInnerError('ERR_INVALID_FILE_TYPE: Expected JSON');
      onFile(null);
      setFileName(null);
      return;
    }

    setFileName(file.name);
    onFile(file);
  }, [accept, onFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [validateAndSetFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  }, [validateAndSetFile]);

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    validateAndSetFile(null);
  };

  const currentError = externalError || innerError;

  return (
    <div className={cn("w-full relative", className)}>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
        {fileName && (
          <div className="flex items-center space-x-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Checksum_Matched</span>
          </div>
        )}
      </div>
      
      <div
        className={cn(
          "relative group border border-white/10 rounded-sm p-5 transition-all cursor-pointer bg-black/40 overflow-hidden",
          dragActive ? "border-orange-500 bg-orange-500/5" : "hover:border-white/20",
          currentError && "border-rose-500/50 bg-rose-500/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        {/* Technical Corner Accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-orange-500/50 transition-colors" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-orange-500/50 transition-colors" />

        <input
          id={`file-input-${label}`}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
          aria-label={label}
        />

        <div className="flex flex-col items-center justify-center space-y-3 relative z-10">
          {fileName ? (
            <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-sm border border-white/10 w-full animate-in zoom-in-95">
              <FileJson className="h-4 w-4 text-orange-500" />
              <span className="text-[10px] font-black font-mono text-zinc-100 truncate flex-grow text-center">{fileName.toUpperCase()}</span>
              <button 
                onClick={clearFile}
                className="hover:text-rose-500 text-zinc-600 transition-colors"
                aria-label="Eject file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="h-6 w-6 text-zinc-600 group-hover:text-orange-500 transition-all duration-300 transform group-hover:-translate-y-1" />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-tight">
                  <span className="text-orange-500/80">Mount_Data</span> OR Drag_Drop
                </p>
                <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-tighter mt-1">Protocols: [JSON_ENC_V2]</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {currentError && (
        <div className="mt-2 flex items-center space-x-2 text-rose-500 animate-in slide-in-from-top-1">
          <div className="w-1 h-3 bg-rose-500" />
          <p className="text-[9px] font-black uppercase tracking-tight">{currentError}</p>
        </div>
      )}
    </div>
  );
}
