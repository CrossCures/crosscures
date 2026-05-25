/**
 * iOS HealthKit provider built on @kingstinct/react-native-healthkit.
 *
 * The library exposes a TypeScript surface that mirrors HealthKit's Swift API.
 * We import dynamically so the file is safe to evaluate on Android/web — the
 * dynamic import never resolves there, but it also never throws because
 * `getIOSProvider()` is only ever called when Platform.OS === "ios".
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
  HK_QUANTITY_BY_CANONICAL,
  CANONICAL_UNIT,
  CANONICAL_UNIT_HK,
  HK_SLEEP_STAGE_TO_CANONICAL,
  canonicalWorkoutType,
} from "./taxonomy";

// The library is loaded lazily so this module can be required on non-iOS
// without crashing Metro at startup time.
let hk: any = null;
function lib(): any {
  if (hk) return hk;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hk = require("@kingstinct/react-native-healthkit");
  return hk;
}

const HK_SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";
const HK_WORKOUT_TYPE = "HKWorkoutTypeIdentifier";

class HealthKitProvider implements WearableProvider {
  readonly platform = "ios" as const;

  async isAvailable(): Promise<boolean> {
    try {
      const m = lib();
      const fn = m.isHealthDataAvailable ?? m.default?.isHealthDataAvailable;
      if (typeof fn !== "function") return false;
      return !!(await fn());
    } catch {
      return false;
    }
  }

  async requestPermissions(types: CanonicalQuantityType[]): Promise<PermissionResult> {
    const m = lib();
    const readTypes = [
      ...types.map((t) => HK_QUANTITY_BY_CANONICAL[t]),
      HK_SLEEP_TYPE,
      HK_WORKOUT_TYPE,
    ];

    const requestAuth = m.requestAuthorization ?? m.default?.requestAuthorization;
    if (typeof requestAuth !== "function") {
      return { granted: [], denied: types };
    }
    try {
      await requestAuth(readTypes, []); // (read, share)
    } catch {
      return { granted: [], denied: types };
    }

    // HealthKit on iOS deliberately does not expose per-type read-grant status
    // (privacy by design). We treat all requested types as "granted" unless the
    // initial probe query throws. Per-type read failures surface later as empty
    // results — not a UX problem because we just skip those types.
    return { granted: types.slice(), denied: [] };
  }

  async grantedPermissions(): Promise<CanonicalQuantityType[]> {
    // See note above — HealthKit hides read auth status. Return the configured
    // set; the sync engine treats empty pulls as "no data" rather than "denied".
    return Object.keys(HK_QUANTITY_BY_CANONICAL) as CanonicalQuantityType[];
  }

  async queryQuantitySamples(opts: {
    type: CanonicalQuantityType;
    anchor?: string | null;
    limit?: number;
    sinceFallback?: Date;
  }): Promise<AnchoredResult<SampleEnvelope>> {
    const m = lib();
    const fn =
      m.queryHealthKitWithAnchorAsync ??
      m.queryAnchoredSamples ??
      m.default?.queryHealthKitWithAnchorAsync;

    const hkType = HK_QUANTITY_BY_CANONICAL[opts.type];
    const unit = CANONICAL_UNIT_HK[opts.type];
    const limit = opts.limit ?? 1000;

    if (typeof fn === "function") {
      try {
        const res = await fn(hkType, {
          unit,
          anchor: opts.anchor ?? undefined,
          limit,
        });
        const newSamples = (res.samples ?? res.newSamples ?? []) as any[];
        const deletedSamples = (res.deletedSamples ?? []) as any[];
        const samples: SampleEnvelope[] = newSamples.map((s) => ({
          sample_id: s.uuid ?? s.id ?? `${hkType}-${s.startDate}-${s.value}`,
          quantity_type: opts.type,
          value: typeof s.value === "number" ? s.value : Number(s.quantity ?? 0),
          unit: CANONICAL_UNIT[opts.type],
          start_date: new Date(s.startDate).toISOString(),
          end_date: new Date(s.endDate ?? s.startDate).toISOString(),
          source_name:
            s.sourceRevision?.source?.name ??
            s.metadata?.HKDeviceManufacturerName ??
            "Apple Health",
        }));
        const deletions: SampleEnvelope[] = deletedSamples.map((d) => ({
          sample_id: d.uuid ?? d.id,
          quantity_type: opts.type,
          value: 0,
          unit: CANONICAL_UNIT[opts.type],
          start_date: new Date(0).toISOString(),
          end_date: new Date(0).toISOString(),
          deleted: true,
        }));
        return {
          samples: [...samples, ...deletions],
          anchor: res.newAnchor ?? res.anchor ?? "",
        };
      } catch {
        return { samples: [], anchor: opts.anchor ?? "" };
      }
    }

    // Fallback: time-window query if anchored API isn't available
    const querySamples =
      m.queryQuantitySamples ??
      m.default?.queryQuantitySamples;
    if (typeof querySamples !== "function") {
      return { samples: [], anchor: "" };
    }
    const from = opts.sinceFallback ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = new Date();
    try {
      const raw = await querySamples(hkType, { unit, from: from.toISOString(), to: to.toISOString(), limit });
      const samples: SampleEnvelope[] = (raw ?? []).map((s: any) => ({
        sample_id: s.uuid ?? s.id ?? `${hkType}-${s.startDate}`,
        quantity_type: opts.type,
        value: typeof s.value === "number" ? s.value : Number(s.quantity ?? 0),
        unit: CANONICAL_UNIT[opts.type],
        start_date: new Date(s.startDate).toISOString(),
        end_date: new Date(s.endDate ?? s.startDate).toISOString(),
        source_name: s.sourceRevision?.source?.name ?? "Apple Health",
      }));
      return { samples, anchor: to.toISOString() };
    } catch {
      return { samples: [], anchor: "" };
    }
  }

  async queryWorkouts(opts: { since?: Date; limit?: number }): Promise<WorkoutEnvelope[]> {
    const m = lib();
    const fn = m.queryWorkouts ?? m.queryWorkoutSamples ?? m.default?.queryWorkouts;
    if (typeof fn !== "function") return [];
    try {
      const from = opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const raw = await fn({ from: from.toISOString(), limit: opts.limit ?? 500 });
      return (raw ?? []).map((w: any) => ({
        sample_id: w.uuid ?? w.id ?? `${w.workoutActivityType}-${w.startDate}`,
        workout_type: canonicalWorkoutType(w.workoutActivityType ?? w.activityType ?? "other"),
        start_date: new Date(w.startDate).toISOString(),
        end_date: new Date(w.endDate).toISOString(),
        duration_seconds: Math.round(w.duration ?? (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 1000),
        total_energy_kcal: w.totalEnergyBurned?.quantity ?? w.totalEnergyBurned,
        total_distance_m: w.totalDistance?.quantity ?? w.totalDistance,
        average_heart_rate: w.metadata?.HKAverageHeartRate,
        source_name: w.sourceRevision?.source?.name ?? "Apple Health",
        metadata: w.metadata,
      }));
    } catch {
      return [];
    }
  }

  async querySleep(opts: { since?: Date; limit?: number }): Promise<SleepSegmentEnvelope[]> {
    const m = lib();
    const fn = m.queryCategorySamples ?? m.default?.queryCategorySamples;
    if (typeof fn !== "function") return [];
    try {
      const from = opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const raw = await fn(HK_SLEEP_TYPE, {
        from: from.toISOString(),
        to: new Date().toISOString(),
        limit: opts.limit ?? 2000,
      });
      // Group adjacent segments from the same source into "sessions" — a new
      // session starts when there's a >2 hour gap between consecutive samples.
      const sorted = (raw ?? []).slice().sort((a: any, b: any) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
      const out: SleepSegmentEnvelope[] = [];
      let sessionId = "";
      let lastEnd = 0;
      for (const s of sorted) {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        if (!sessionId || start - lastEnd > 2 * 60 * 60 * 1000) {
          sessionId = `s-${start}`;
        }
        out.push({
          sample_id: s.uuid ?? s.id ?? `sleep-${start}`,
          session_id: sessionId,
          stage: HK_SLEEP_STAGE_TO_CANONICAL[s.value] ?? "asleep_unspecified",
          start_date: new Date(start).toISOString(),
          end_date: new Date(end).toISOString(),
          source_name: s.sourceRevision?.source?.name ?? "Apple Health",
        });
        lastEnd = end;
      }
      return out;
    } catch {
      return [];
    }
  }

  async enableBackgroundDelivery(types: CanonicalQuantityType[]): Promise<void> {
    const m = lib();
    const fn =
      m.enableBackgroundDeliveryAsync ??
      m.enableBackgroundDelivery ??
      m.default?.enableBackgroundDeliveryAsync;
    if (typeof fn !== "function") return;
    for (const t of types) {
      try {
        await fn(HK_QUANTITY_BY_CANONICAL[t], "immediate");
      } catch {
        // Per-type background delivery isn't critical — foreground sync covers it.
      }
    }
  }
}

let _provider: HealthKitProvider | null = null;
export function getIOSProvider(): WearableProvider {
  if (!_provider) _provider = new HealthKitProvider();
  return _provider;
}
