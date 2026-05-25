import type { WearableSummary } from "@/lib/api";
import { Heart, Activity, Droplets, Thermometer, Wind, Scale, Footprints } from "lucide-react";

const TILES: { key: string; label: string; unit: string; icon: typeof Heart; from?: "latest" | "today"; format?: (n: number) => string }[] = [
  { key: "heart_rate", label: "Heart rate", unit: "bpm", icon: Heart },
  { key: "resting_heart_rate", label: "Resting HR", unit: "bpm", icon: Heart },
  { key: "oxygen_saturation", label: "Blood oxygen", unit: "%", icon: Droplets },
  { key: "respiratory_rate", label: "Respiration", unit: "br/min", icon: Wind },
  { key: "body_temperature", label: "Temp", unit: "°C", icon: Thermometer },
  { key: "body_mass", label: "Weight", unit: "kg", icon: Scale },
  { key: "step_count", label: "Steps today", unit: "", icon: Footprints, from: "today", format: (n) => Math.round(n).toLocaleString() },
  { key: "active_energy_burned", label: "Active kcal", unit: "", icon: Activity, from: "today", format: (n) => Math.round(n).toString() },
];

export function VitalsSnapshot({ summary }: { summary: WearableSummary | undefined }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {TILES.map((t) => {
        const source = t.from ?? "latest";
        const value = source === "latest" ? summary.latest?.[t.key]?.value : summary.today?.[t.key];
        const displayUnit = source === "latest" ? summary.latest?.[t.key]?.unit ?? t.unit : t.unit;
        const Icon = t.icon;
        return (
          <div
            key={t.key + (t.from ?? "")}
            className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900">
                {value == null ? "—" : t.format ? t.format(value) : value < 10 ? value.toFixed(1) : Math.round(value)}
              </span>
              {value != null && displayUnit ? (
                <span className="text-xs text-slate-400">{displayUnit}</span>
              ) : null}
            </div>
            {source === "latest" && summary.latest?.[t.key]?.source ? (
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                {summary.latest[t.key].source}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
