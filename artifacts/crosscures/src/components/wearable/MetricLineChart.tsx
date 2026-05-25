import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { WearableSeriesPoint } from "@/lib/api";

interface Props {
  data: WearableSeriesPoint[];
  unit: string | null;
  label?: string;
  color?: string;
  height?: number;
  bucket?: "hour" | "day";
}

export function MetricLineChart({ data, unit, color = "#0ea5e9", height = 240, bucket = "day" }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No data in this window.
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(t) => (bucket === "hour" ? new Date(t).toLocaleTimeString([], { hour: "numeric" }) : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }))}
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(2)} ${unit ?? ""}`, "avg"]}
            labelFormatter={(t) => new Date(t as string).toLocaleString()}
            contentStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
