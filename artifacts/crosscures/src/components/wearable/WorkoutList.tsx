import type { WearableWorkout } from "@/lib/api";
import { Activity } from "lucide-react";

export function WorkoutList({ workouts }: { workouts: WearableWorkout[] }) {
  if (workouts.length === 0) {
    return <div className="text-slate-400 text-sm">No workouts in this window.</div>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {workouts.map((w) => (
        <li key={w.sample_id} className="py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-crosscure-50 flex items-center justify-center">
            <Activity className="w-4 h-4 text-crosscure-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 capitalize truncate">
              {humanWorkout(w.workout_type)}
            </div>
            <div className="text-xs text-slate-400">
              {new Date(w.start_date).toLocaleString()} · {Math.round(w.duration_seconds / 60)} min
              {w.total_energy_kcal != null ? ` · ${Math.round(w.total_energy_kcal)} kcal` : ""}
              {w.total_distance_m != null ? ` · ${(w.total_distance_m / 1000).toFixed(2)} km` : ""}
            </div>
          </div>
          {w.source ? <div className="text-[10px] text-slate-400 hidden sm:block">{w.source}</div> : null}
        </li>
      ))}
    </ul>
  );
}

function humanWorkout(t: string): string {
  return t.replace(/_/g, " ");
}
