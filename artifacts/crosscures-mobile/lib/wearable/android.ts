/**
 * Android Health Connect provider built on react-native-health-connect.
 *
 * Health Connect does not expose an "anchored query" API — we approximate
 * incremental sync by tracking a per-type last_synced_at timestamp in
 * AsyncStorage (see anchorStore) and reading records strictly after that
 * timestamp on each call. The "anchor" we return is just the ISO timestamp
 * of the most recent record observed.
 */
import type {
  AnchoredResult,
  CanonicalQuantityType,
  PermissionResult,
  SampleEnvelope,
  SleepSegmentEnvelope,
  WearableProvider,
  WorkoutEnvelope,
} from "./types";
import {
  HC_RECORD_BY_CANONICAL,
  HC_PERMISSIONS_BY_CANONICAL,
  HC_SLEEP_STAGE_TO_CANONICAL,
  CANONICAL_UNIT,
  canonicalWorkoutType,
} from "./taxonomy";

let hc: any = null;
function lib(): any {
  if (hc) return hc;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hc = require("react-native-health-connect");
  return hc;
}

class HealthConnectProvider implements WearableProvider {
  readonly platform = "android" as const;

  async isAvailable(): Promise<boolean> {
    try {
      const m = lib();
      const init = m.initialize ?? m.default?.initialize;
      if (typeof init !== "function") return false;
      const ok = await init();
      return !!ok;
    } catch {
      return false;
    }
  }

  async requestPermissions(types: CanonicalQuantityType[]): Promise<PermissionResult> {
    const m = lib();
    const fn = m.requestPermission ?? m.default?.requestPermission;
    if (typeof fn !== "function") return { granted: [], denied: types };

    const recordTypeOf: Record<CanonicalQuantityType, string> = HC_RECORD_BY_CANONICAL;
    const wanted = Array.from(
      new Map(
        types.map((t) => [recordTypeOf[t], { accessType: "read", recordType: recordTypeOf[t] }]),
      ).values(),
    );

    try {
      const grantedPerms = (await fn(wanted)) as any[];
      const grantedSet = new Set(
        (grantedPerms ?? [])
          .filter((p) => p.accessType === "read")
          .map((p) => p.recordType),
      );
      const granted: CanonicalQuantityType[] = [];
      const denied: CanonicalQuantityType[] = [];
      for (const t of types) {
        (grantedSet.has(recordTypeOf[t]) ? granted : denied).push(t);
      }
      return { granted, denied };
    } catch {
      return { granted: [], denied: types };
    }
  }

  async grantedPermissions(): Promise<CanonicalQuantityType[]> {
    const m = lib();
    const fn = m.getGrantedPermissions ?? m.default?.getGrantedPermissions;
    if (typeof fn !== "function") return [];
    try {
      const grants = (await fn()) as any[];
      const grantedRecords = new Set(grants.map((p) => p.recordType));
      return (Object.keys(HC_RECORD_BY_CANONICAL) as CanonicalQuantityType[]).filter((t) =>
        grantedRecords.has(HC_RECORD_BY_CANONICAL[t]),
      );
    } catch {
      return [];
    }
  }

  async queryQuantitySamples(opts: {
    type: CanonicalQuantityType;
    anchor?: string | null;
    limit?: number;
    sinceFallback?: Date;
  }): Promise<AnchoredResult<SampleEnvelope>> {
    const m = lib();
    const fn = m.readRecords ?? m.default?.readRecords;
    if (typeof fn !== "function") return { samples: [], anchor: opts.anchor ?? "" };

    const recordType = HC_RECORD_BY_CANONICAL[opts.type];
    const fromIso =
      opts.anchor && opts.anchor.length > 0
        ? opts.anchor
        : (opts.sinceFallback ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
    const toIso = new Date().toISOString();

    let raw: any;
    try {
      raw = await fn(recordType, {
        timeRangeFilter: { operator: "between", startTime: fromIso, endTime: toIso },
        pageSize: opts.limit ?? 1000,
      });
    } catch {
      return { samples: [], anchor: opts.anchor ?? "" };
    }

    const records: any[] = raw?.records ?? raw ?? [];
    const samples: SampleEnvelope[] = [];
    let maxEnd = fromIso;

    for (const r of records) {
      const sampleId = r.metadata?.id ?? r.metadata?.clientRecordId ?? `${recordType}-${r.time ?? r.startTime}`;
      const sourceName = r.metadata?.dataOrigin ?? "Health Connect";

      if (opts.type === "blood_pressure_systolic" || opts.type === "blood_pressure_diastolic") {
        const val = opts.type === "blood_pressure_systolic" ? r.systolic?.inMillimetersOfMercury : r.diastolic?.inMillimetersOfMercury;
        if (val == null) continue;
        samples.push({
          sample_id: `${sampleId}-${opts.type}`,
          quantity_type: opts.type,
          value: val,
          unit: CANONICAL_UNIT[opts.type],
          start_date: r.time ?? r.startTime,
          end_date: r.time ?? r.endTime ?? r.startTime,
          source_name: sourceName,
        });
      } else {
        const value = extractValue(r, opts.type);
        if (value == null) continue;
        samples.push({
          sample_id: sampleId,
          quantity_type: opts.type,
          value,
          unit: CANONICAL_UNIT[opts.type],
          start_date: r.time ?? r.startTime,
          end_date: r.time ?? r.endTime ?? r.startTime,
          source_name: sourceName,
        });
      }
      const endStr = r.endTime ?? r.time;
      if (endStr && endStr > maxEnd) maxEnd = endStr;
    }

    return { samples, anchor: maxEnd };
  }

  async queryWorkouts(opts: { since?: Date; limit?: number }): Promise<WorkoutEnvelope[]> {
    const m = lib();
    const fn = m.readRecords ?? m.default?.readRecords;
    if (typeof fn !== "function") return [];
    try {
      const fromIso = (opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
      const raw = await fn("ExerciseSession", {
        timeRangeFilter: { operator: "between", startTime: fromIso, endTime: new Date().toISOString() },
        pageSize: opts.limit ?? 500,
      });
      const records: any[] = raw?.records ?? raw ?? [];
      return records.map((r) => ({
        sample_id: r.metadata?.id ?? `exercise-${r.startTime}`,
        workout_type: canonicalWorkoutType(r.exerciseType ?? "other"),
        start_date: r.startTime,
        end_date: r.endTime,
        duration_seconds: Math.round(
          (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 1000,
        ),
        source_name: r.metadata?.dataOrigin ?? "Health Connect",
        metadata: { exerciseType: r.exerciseType, title: r.title, notes: r.notes },
      }));
    } catch {
      return [];
    }
  }

  async querySleep(opts: { since?: Date; limit?: number }): Promise<SleepSegmentEnvelope[]> {
    const m = lib();
    const fn = m.readRecords ?? m.default?.readRecords;
    if (typeof fn !== "function") return [];
    try {
      const fromIso = (opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
      const raw = await fn("SleepSession", {
        timeRangeFilter: { operator: "between", startTime: fromIso, endTime: new Date().toISOString() },
        pageSize: opts.limit ?? 500,
      });
      const records: any[] = raw?.records ?? raw ?? [];
      const out: SleepSegmentEnvelope[] = [];
      for (const session of records) {
        const sessionId = session.metadata?.id ?? `sleep-${session.startTime}`;
        const stages = session.stages ?? [
          {
            stage: 2, // generic sleeping
            startTime: session.startTime,
            endTime: session.endTime,
          },
        ];
        for (const stg of stages) {
          out.push({
            sample_id: `${sessionId}-${stg.startTime}`,
            session_id: sessionId,
            stage: HC_SLEEP_STAGE_TO_CANONICAL[stg.stage] ?? "asleep_unspecified",
            start_date: stg.startTime,
            end_date: stg.endTime,
            source_name: session.metadata?.dataOrigin ?? "Health Connect",
          });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  async enableBackgroundDelivery(_types: CanonicalQuantityType[]): Promise<void> {
    // Health Connect has no equivalent of HKObserverQuery; background sync is
    // driven by expo-background-fetch (registered in the sync engine).
  }
}

function extractValue(r: any, type: CanonicalQuantityType): number | null {
  // Health Connect record shapes vary per type — pull the most common fields.
  switch (type) {
    case "step_count":
      return r.count ?? null;
    case "distance_walking_running":
      return r.distance?.inMeters ?? null;
    case "active_energy_burned":
    case "basal_energy_burned":
    case "dietary_energy_consumed":
      return r.energy?.inKilocalories ?? null;
    case "flights_climbed":
      return r.floors ?? null;
    case "heart_rate":
      // HeartRateRecord has `samples: [{ beatsPerMinute, time }]` — caller normally
      // gets one record per beat; we sum length=1, so return BPM directly. For
      // record types with multiple samples, the adapter returns one envelope per record.
      if (Array.isArray(r.samples) && r.samples.length === 1) return r.samples[0].beatsPerMinute;
      return r.beatsPerMinute ?? null;
    case "resting_heart_rate":
      return r.beatsPerMinute ?? null;
    case "heart_rate_variability_sdnn":
      return r.heartRateVariabilityMillis ?? null;
    case "oxygen_saturation":
      return r.percentage ?? null;
    case "respiratory_rate":
      return r.rate ?? null;
    case "body_mass":
      return r.weight?.inKilograms ?? null;
    case "body_temperature":
      return r.temperature?.inCelsius ?? null;
    case "blood_glucose":
      return r.level?.inMillimolesPerLiter ?? null;
    case "water_intake":
      return r.volume?.inMilliliters ?? null;
    case "mindful_minutes":
      // MindfulnessSession has start/end — compute minutes.
      return Math.round(
        (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000,
      );
    case "menstrual_flow":
      return r.flow ?? 0;
    default:
      return null;
  }
}

let _provider: HealthConnectProvider | null = null;
export function getAndroidProvider(): WearableProvider {
  if (!_provider) _provider = new HealthConnectProvider();
  return _provider;
}
