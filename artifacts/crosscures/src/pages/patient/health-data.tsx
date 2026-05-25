import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Activity, Moon, Stethoscope, RefreshCw, Smartphone } from "lucide-react";

import PatientLayout from "@/components/PatientLayout";
import { patientApi, type WearableSeries } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { VitalsSnapshot } from "@/components/wearable/VitalsSnapshot";
import { MetricLineChart } from "@/components/wearable/MetricLineChart";
import { SleepStageChart } from "@/components/wearable/SleepStageChart";
import { WorkoutList } from "@/components/wearable/WorkoutList";
import { cn } from "@/lib/utils";

type Tab = "activity" | "heart" | "sleep" | "vitals";

const RANGES = [
  { key: "7d", days: 7, bucket: "day" as const, label: "7d" },
  { key: "30d", days: 30, bucket: "day" as const, label: "30d" },
  { key: "90d", days: 90, bucket: "day" as const, label: "90d" },
];

export default function HealthDataPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("vitals");
  const [rangeKey, setRangeKey] = useState("30d");
  const range = RANGES.find((r) => r.key === rangeKey)!;

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { from, to } = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000).toISOString(),
      to: now.toISOString(),
    };
  }, [range.days]);

  const summaryQ = useQuery({
    queryKey: ["wearable", "summary"],
    queryFn: () => patientApi.getWearableSummary().then((r) => r.data),
  });

  const sleepQ = useQuery({
    queryKey: ["wearable", "sleep", rangeKey],
    queryFn: () => patientApi.getWearableSleep({ from, to }).then((r) => r.data.sessions ?? []),
    enabled: tab === "sleep",
  });

  const workoutsQ = useQuery({
    queryKey: ["wearable", "workouts", rangeKey],
    queryFn: () => patientApi.getWearableWorkouts({ from, to }).then((r) => r.data.workouts ?? []),
    enabled: tab === "activity",
  });

  const heartHRQ = useQuery({
    queryKey: ["wearable", "series", "heart_rate", rangeKey],
    queryFn: () =>
      patientApi
        .getWearableSeries({ quantity_type: "heart_rate", from, to, bucket: range.bucket })
        .then((r) => r.data),
    enabled: tab === "heart",
  });

  const heartRHRQ = useQuery({
    queryKey: ["wearable", "series", "resting_heart_rate", rangeKey],
    queryFn: () =>
      patientApi
        .getWearableSeries({ quantity_type: "resting_heart_rate", from, to, bucket: range.bucket })
        .then((r) => r.data),
    enabled: tab === "heart",
  });

  const stepsQ = useQuery({
    queryKey: ["wearable", "series", "step_count", rangeKey],
    queryFn: () =>
      patientApi
        .getWearableSeries({ quantity_type: "step_count", from, to, bucket: range.bucket })
        .then((r) => r.data),
    enabled: tab === "activity",
  });

  const spo2Q = useQuery({
    queryKey: ["wearable", "series", "oxygen_saturation", rangeKey],
    queryFn: () =>
      patientApi
        .getWearableSeries({ quantity_type: "oxygen_saturation", from, to, bucket: range.bucket })
        .then((r) => r.data),
    enabled: tab === "vitals",
  });

  const hrvQ = useQuery({
    queryKey: ["wearable", "series", "heart_rate_variability_sdnn", rangeKey],
    queryFn: () =>
      patientApi
        .getWearableSeries({ quantity_type: "heart_rate_variability_sdnn", from, to, bucket: range.bucket })
        .then((r) => r.data),
    enabled: tab === "vitals",
  });

  const isEmpty =
    summaryQ.data &&
    Object.keys(summaryQ.data.latest ?? {}).length === 0 &&
    Object.keys(summaryQ.data.today ?? {}).length === 0 &&
    !summaryQ.data.last_night_sleep &&
    (summaryQ.data.recent_workouts ?? []).length === 0;

  return (
    <PatientLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title text-2xl">Health data</h1>
            <p className="text-slate-400 text-sm mt-1">From your Apple Health and Health Connect</p>
          </div>
          <button
            onClick={() => summaryQ.refetch()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className={cn("w-4 h-4", summaryQ.isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>

        {isEmpty ? (
          <div className="metric-card text-center py-12">
            <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800 mb-1">No wearable data yet</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Open the CrossCures mobile app on your iPhone or Android phone and turn on
              <span className="font-medium"> Sync wearable data </span>
              in Settings. Data will appear here within a few minutes.
            </p>
          </div>
        ) : (
          <>
            <VitalsSnapshot summary={summaryQ.data} />

            <div className="mt-8 flex items-center gap-2 border-b border-slate-200">
              <TabBtn label="Vitals" icon={Stethoscope} active={tab === "vitals"} onClick={() => setTab("vitals")} />
              <TabBtn label="Heart" icon={Heart} active={tab === "heart"} onClick={() => setTab("heart")} />
              <TabBtn label="Activity" icon={Activity} active={tab === "activity"} onClick={() => setTab("activity")} />
              <TabBtn label="Sleep" icon={Moon} active={tab === "sleep"} onClick={() => setTab("sleep")} />
              <div className="ml-auto flex gap-1.5 pb-2">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRangeKey(r.key)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full",
                      rangeKey === r.key ? "bg-crosscure-500 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {tab === "heart" && (
                <>
                  <ChartCard title="Heart rate" data={heartHRQ.data}>
                    <MetricLineChart data={heartHRQ.data?.series ?? []} unit={heartHRQ.data?.unit ?? "bpm"} color="#ef4444" bucket={range.bucket} />
                  </ChartCard>
                  <ChartCard title="Resting heart rate" data={heartRHRQ.data}>
                    <MetricLineChart data={heartRHRQ.data?.series ?? []} unit={heartRHRQ.data?.unit ?? "bpm"} color="#0ea5e9" bucket={range.bucket} />
                  </ChartCard>
                </>
              )}
              {tab === "activity" && (
                <>
                  <ChartCard title="Steps per day" data={stepsQ.data}>
                    <MetricLineChart data={stepsQ.data?.series.map((p) => ({ ...p, avg: p.sum })) ?? []} unit={stepsQ.data?.unit ?? "count"} color="#0ea5e9" bucket={range.bucket} />
                  </ChartCard>
                  <div className="metric-card">
                    <h3 className="font-semibold text-slate-800 mb-3">Workouts</h3>
                    <WorkoutList workouts={workoutsQ.data ?? []} />
                  </div>
                </>
              )}
              {tab === "sleep" && (
                <div className="metric-card">
                  <h3 className="font-semibold text-slate-800 mb-3">Sleep by stage</h3>
                  <SleepStageChart sessions={sleepQ.data ?? []} />
                </div>
              )}
              {tab === "vitals" && (
                <>
                  <ChartCard title="Blood oxygen (SpO2)" data={spo2Q.data}>
                    <MetricLineChart data={spo2Q.data?.series ?? []} unit={spo2Q.data?.unit ?? "%"} color="#14b8a6" bucket={range.bucket} />
                  </ChartCard>
                  <ChartCard title="Heart rate variability" data={hrvQ.data}>
                    <MetricLineChart data={hrvQ.data?.series ?? []} unit={hrvQ.data?.unit ?? "ms"} color="#8b5cf6" bucket={range.bucket} />
                  </ChartCard>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PatientLayout>
  );
}

function TabBtn({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Heart; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px",
        active ? "border-crosscure-500 text-crosscure-600" : "border-transparent text-slate-500 hover:text-slate-700",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ChartCard({ title, children, data }: { title: string; children: React.ReactNode; data?: WearableSeries | undefined }) {
  const series = data?.series ?? [];
  const stats = series.length > 0
    ? {
        avg: series.reduce((acc, p) => acc + p.avg, 0) / series.length,
        min: Math.min(...series.map((p) => p.min)),
        max: Math.max(...series.map((p) => p.max)),
      }
    : null;
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {stats ? (
          <div className="text-xs text-slate-400">
            avg {fmt(stats.avg)} · min {fmt(stats.min)} · max {fmt(stats.max)} {data?.unit ?? ""}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  if (Math.abs(n) >= 10) return n.toFixed(0);
  return n.toFixed(1);
}
