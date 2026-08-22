"use client";

import { useId } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LineChart({
  data,
  xKey,
  yKey,
  height = 200,
  color,
  secondaryKey,
  secondaryColor,
  referenceLine,
  connectNulls,
}: {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  secondaryKey?: string;
  secondaryColor?: string;
  referenceLine?: number;
  connectNulls?: boolean;
}) {
  const rawId = useId();
  const gradId = `grad-${rawId.replace(/:/g, "")}`;
  const stroke = color ?? "var(--text-display)";

  const values = data
    .map((d) => d[yKey])
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const secondaryValues = secondaryKey
    ? data
        .map((d) => d[secondaryKey])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
    : [];
  const allValues = [...values, ...secondaryValues];
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const range = max - min;
  const pad = range > 0 ? range * 0.15 : 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          stroke="var(--border-visible)"
          width={48}
          domain={[min - pad, max + pad]}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border-visible)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
          labelStyle={{ color: "var(--text-secondary)" }}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          connectNulls={connectNulls}
        />
        {secondaryKey && (
          <Line
            type="monotone"
            dataKey={secondaryKey}
            stroke={secondaryColor ?? stroke}
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={connectNulls}
          />
        )}
        {referenceLine != null && referenceLine > 0 && (
          <ReferenceLine
            y={referenceLine}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
