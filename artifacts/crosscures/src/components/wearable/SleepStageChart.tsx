import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import type { WearableSleepSession } from "@/lib/api";

const STAGE_COLORS: Record<string, string> = {
  asleep_deep: "#1e40af",
  asleep_core: "#3b82f6",
  asleep_rem: "#8b5cf6",
  asleep_unspecified: "#64748b",
  awake: "#f59e0b",
  in_bed: "#cbd5e1",
};

const STAGE_ORDER = ["asleep_deep", "asleep_core", "asleep_rem", "asleep_unspecified", "awake"];

const STAGE_LABEL: Record<string, string> = {
  asleep_deep: "Deep",
  asleep_core: "Core",
  asleep_rem: "REM",
  asleep_unspecified: "Asleep",
  awake: "Awake",
  in_bed: "In bed",
};

export function SleepStageChart({ sessions, height = 240 }: { sessions: WearableSleepSession[]; height?: number }) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No sleep data in this window.
      </div>
    );
  }
  const data = sessions
    .slice()
    .sort((a, b) => a.session_start.localeCompare(b.session_start))
    .map((s) => ({
      date: new Date(s.session_start).toLocaleDateString([], { month: "short", day: "numeric" }),
      ...STAGE_ORDER.reduce<Record<string, number>>((acc, k) => {
        acc[k] = s.stages[k] ?? 0;
        return acc;
      }, {}),
    }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="m" />
          <Tooltip formatter={(v: number, k: string) => [`${Math.round(v)} min`, STAGE_LABEL[k] ?? k]} contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STAGE_LABEL[v] ?? v} />
          {STAGE_ORDER.map((k) => (
            <Bar key={k} dataKey={k} stackId="sleep" fill={STAGE_COLORS[k]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
