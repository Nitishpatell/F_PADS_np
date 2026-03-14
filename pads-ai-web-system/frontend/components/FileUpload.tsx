'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileJson } from 'lucide-react';
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
}

export default function FileUpload({ label, onFile, accept = '.json', error: externalError }: FileUploadProps) {
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
      setInnerError('Please upload a valid JSON file');
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
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={cn(
          "relative group border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50",
          currentError && "border-red-300 bg-red-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
          aria-label={label}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {fileName ? (
            <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
              <FileJson className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{fileName}</span>
              <button 
                onClick={clearFile}
                className="hover:text-red-500 text-gray-400"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">JSON files only</p>
            </>
          )}
        </div>
      </div>
      {currentError && (
        <p className="mt-2 text-sm text-red-600">{currentError}</p>
      )}
    </div>
  );
}
