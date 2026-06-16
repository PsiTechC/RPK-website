import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Lightweight responsive area chart (green gradient fill) built on react-native-svg.
// Stretches to the container width via a viewBox + preserveAspectRatio="none".
export function AreaChart({ data, height = 90, color = '#16A34A' }: { data: number[]; height?: number; color?: string }) {
  const W = 300;
  const pad = 6;
  const h = height - pad * 2;
  const max = Math.max(1, ...data);
  const n = data.length;
  const stepX = n > 1 ? W / (n - 1) : W;
  const pts = data.map((v, i) => [i * stepX, pad + h - (v / max) * h] as const);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${W},${height} L0,${height} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="rpkArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#rpkArea)" />
      <Path d={line} stroke={color} strokeWidth={2.5} fill="none" />
    </Svg>
  );
}
