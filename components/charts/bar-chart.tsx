"use client";

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function BarChart({
  data,
  xKey,
  yKey,
  height = 200,
  color,
  referenceLine,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  referenceLine?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border-visible)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        />
        <Bar dataKey={yKey} fill={color ?? "var(--text-display)"} />
        {referenceLine != null && referenceLine > 0 && (
          <ReferenceLine
            y={referenceLine}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
      </RBarChart>
    </ResponsiveContainer>
  );
}
