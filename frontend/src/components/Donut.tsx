import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';

export type DonutSlice = { value: number; color: string };

// A lightweight donut/pie chart drawn with SVG strokeDasharray segments.
export function Donut({ slices, size = 170, thickness = 26 }: { slices: DonutSlice[]; size?: number; thickness?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const center = size / 2;
  let offset = 0;

  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(-90, ${center}, ${center})`}>
        {slices.map((s, i) => {
          const dash = (s.value / total) * circ;
          const el = (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </G>
    </Svg>
  );
}
