'use client';

import { PatientInfo } from '@/lib/types';
import { User, Dna, Ruler, Weight, UserCircle } from 'lucide-react';

interface PatientCardProps {
  patient: PatientInfo | null;
}

export default function PatientCard({ patient }: PatientCardProps) {
  if (!patient) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
        <div className="p-3 bg-gray-50 rounded-full">
          <UserCircle className="h-8 w-8 text-gray-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Demographic Data</h3>
          <p className="text-xs text-gray-500 mt-1">No patient file uploaded</p>
        </div>
      </div>
    );
  }

  const renderField = (label: string, value: string | number | null, Icon: any, unit?: string) => (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</p>
        <p className="text-sm font-semibold text-gray-900">
          {value !== null && value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center space-x-2 mb-6">
        <UserCircle className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Patient Profile</h2>
      </div>

      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        {renderField('Ground Truth', patient.condition, Dna)}
        {renderField('Age', patient.age, User, 'yrs')}
        {renderField('Gender', patient.gender, User)}
        {renderField('Handedness', patient.handedness, User)}
        {renderField('Height', patient.height, Ruler, 'cm')}
        {renderField('Weight', patient.weight, Weight, 'kg')}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50">
        <p className="text-[10px] text-gray-400 italic">
          Note: Patient ID and other PII have been redacted for security.
        </p>
      </div>
    </div>
  );
}
