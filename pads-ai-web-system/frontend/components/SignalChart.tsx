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
      <div className="h-44 flex flex-col items-center justify-center technical-panel bg-black/40 border-dashed border-zinc-800 animate-pulse">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">Awaiting_Stream</div>
      </div>
    );
  }

  return (
    <div className="technical-panel bg-black/20 p-4 group border-white/5 hover:border-orange-500/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] group-hover:text-orange-500 transition-colors">
            {channel.replace('_', ' ')}
          </h3>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase">Unit: {unit}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            <span className="text-[9px] font-bold text-zinc-600 uppercase">Res: 10ms</span>
          </div>
        </div>
        <button
          onClick={zoomOut}
          className="text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all border border-white/5 px-2 py-0.5"
        >
          Reset_View
        </button>
      </div>

      <div className="h-32 select-none" aria-label={`Oscilloscope for ${channel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel || '')}
            onMouseMove={(e) => e && refAreaLeft && setRefAreaRight(e.activeLabel || '')}
            onMouseUp={zoom}
          >
            <CartesianGrid 
              strokeDasharray="2 6" 
              vertical={true} 
              horizontal={true} 
              stroke="rgba(255,255,255,0.05)" 
            />
            <XAxis
              dataKey="time"
              domain={[left, right]}
              type="number"
              hide={true}
            />
            <YAxis
              domain={[bottom, top]}
              hide={true}
            />
            <Tooltip
              labelFormatter={(label) => `T: ${Number(label).toFixed(3)}s`}
              contentStyle={{ 
                fontSize: '9px', 
                fontWeight: 900,
                borderRadius: '0px', 
                border: '1px solid rgba(255,107,0,0.2)', 
                backgroundColor: 'rgba(10, 10, 12, 0.95)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                padding: '8px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)' 
              }}
              itemStyle={{ color: '#ff6b00', padding: 0 }}
              cursor={{ stroke: '#ff6b00', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#ff6b00"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#ff6b00', strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
            />
            {refAreaLeft && refAreaRight ? (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fill="rgba(255,107,0,0.1)" />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Oscilloscope Border Accents */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />
        <div className="absolute top-0 right-0 w-full h-[1px] bg-white/5" />
      </div>
    </div>
  );
}
