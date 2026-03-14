'use client';

import { SessionSummary } from '@/lib/types';
import { MousePointer2, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SessionSelectorProps {
  sessions: SessionSummary[];
  selectedSession: string;
  selectedWrist: 'LeftWrist' | 'RightWrist';
  onSessionChange: (session: string) => void;
  onWristChange: (wrist: 'LeftWrist' | 'RightWrist') => void;
}

export default function SessionSelector({
  sessions,
  selectedSession,
  selectedWrist,
  onSessionChange,
  onWristChange,
}: SessionSelectorProps) {
  const currentSession = sessions.find((s) => s.record_name === selectedSession);
  const rows = currentSession?.rows || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Movement Session</label>
        <div className="relative">
          <select
            value={selectedSession}
            onChange={(e) => onSessionChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          >
            {sessions.map((s) => (
              <option key={s.record_name} value={s.record_name}>
                {s.record_name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <MousePointer2 className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Device Location</label>
        <div className="flex space-x-4">
          {(['LeftWrist', 'RightWrist'] as const).map((wrist) => (
            <label key={wrist} className="inline-flex items-center cursor-pointer group">
              <input
                type="radio"
                className="sr-only"
                name="wrist"
                value={wrist}
                checked={selectedWrist === wrist}
                onChange={() => onWristChange(wrist)}
              />
              <div
                className={cn(
                  "px-4 py-2 rounded-md border text-sm font-medium transition-all",
                  selectedWrist === wrist
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 group-hover:bg-gray-50"
                )}
              >
                {wrist === 'LeftWrist' ? 'Left Wrist' : 'Right Wrist'}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Activity className="h-4 w-4 text-blue-500" />
        <span className="text-xs text-blue-700 font-medium">
          {rows.toLocaleString()} samples available for selection
        </span>
      </div>
    </div>
  );
}
