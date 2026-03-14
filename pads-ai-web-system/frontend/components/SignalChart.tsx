'use client';

import { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

interface SignalChartProps {
  channel: string;
  unit: string;
  timeValues: number[];
  signalValues: number[];
}

export default function SignalChart({
  channel,
  unit,
  timeValues,
  signalValues,
}: SignalChartProps) {
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [left, setLeft] = useState<string | number>('dataMin');
  const [right, setRight] = useState<string | number>('dataMax');
  const [top, setTop] = useState<string | number>('dataMax+1');
  const [bottom, setBottom] = useState<string | number>('dataMin-1');

  const data = timeValues.map((t, i) => ({
    time: t,
    value: signalValues[i],
  }));

  const zoom = useCallback(() => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let [l, r] = [refAreaLeft, refAreaRight];
    if (l > r) [l, r] = [r, l];

    setLeft(l);
    setRight(r);
    setRefAreaLeft('');
    setRefAreaRight('');
  }, [refAreaLeft, refAreaRight]);

  const zoomOut = useCallback(() => {
    setLeft('dataMin');
    setRight('dataMax');
    setTop('dataMax+1');
    setBottom('dataMin-1');
    setRefAreaLeft('');
    setRefAreaRight('');
  }, []);

  if (signalValues.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border rounded-lg animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
        <div className="h-2 w-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          {channel} <span className="text-gray-400 font-normal">({unit})</span>
        </h3>
        <button
          onClick={zoomOut}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Reset Zoom
        </button>
      </div>

      <div className="h-48 select-none" aria-label={`Chart for ${channel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel || '')}
            onMouseMove={(e) => e && refAreaLeft && setRefAreaRight(e.activeLabel || '')}
            onMouseUp={zoom}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              domain={[left, right]}
              type="number"
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              tickFormatter={(val) => val.toFixed(1)}
            />
            <YAxis
              domain={[bottom, top]}
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              tickFormatter={(val) => val.toFixed(2)}
            />
            <Tooltip
              labelFormatter={(label) => `Time: ${Number(label).toFixed(3)}s`}
              contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {refAreaLeft && refAreaRight ? (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3b82f6" fillOpacity={0.1} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
