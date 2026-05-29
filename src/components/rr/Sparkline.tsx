import React from 'react';

interface Props {
  data: number[];
  color?: string;
  invert?: boolean; // for SERP position, lower is better so invert
  width?: number;
  height?: number;
}

const Sparkline: React.FC<Props> = ({ data, color = '#34d399', invert = false, width = 100, height = 32 }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    let norm = (v - min) / range;
    if (invert) norm = 1 - norm;
    const y = height - norm * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;
  const id = React.useId();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default Sparkline;
