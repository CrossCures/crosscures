import { patientApi } from "@/lib/api";
import type {
  CanonicalQuantityType,
  SampleEnvelope,
  SleepSegmentEnvelope,
  WearableProvider,
  WorkoutEnvelope,
} from "./types";
import { ENABLED_QUANTITY_TYPES } from "./types";
import { anchorStore } from "./anchorStore";
import { getWearableProvider } from "./index";

export type SyncReason = "initial" | "foreground" | "background" | "manual";

export interface SyncResult {
  batch_id: string;
  reason: SyncReason;
  samples_accepted: number;
  samples_duplicates: number;
  samples_rejected: number;
  samples_deleted: number;
  workouts_accepted: number;
  sleep_accepted: number;
  errors: string[];
  duration_ms: number;
}

const MAX_BATCH = 1000;

function uuid(): string {
  // RFC4122 v4 — sufficient for client-side batch ids.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface SyncOptions {
  reason: SyncReason;
  /** Restrict sync to these quantity types (e.g. background observer for HR only). */
  onlyTypes?: CanonicalQuantityType[];
  /** Override the provider (used in tests). */
  provider?: WearableProvider;
}

export async function syncOnce(opts: SyncOptions): Promise<SyncResult> {
  const t0 = Date.now();
  const batch_id = uuid();
  const provider = opts.provider ?? getWearableProvider();
  const result: SyncResult = {
    batch_id,
    reason: opts.reason,
    samples_accepted: 0,
    samples_duplicates: 0,
    samples_rejected: 0,
    samples_deleted: 0,
    workouts_accepted: 0,
    sleep_accepted: 0,
    errors: [],
    duration_ms: 0,
  };

  if (!(await provider.isAvailable())) {
    result.errors.push("provider_unavailable");
    result.duration_ms = Date.now() - t0;
    return result;
  }

  const types = opts.onlyTypes ?? ENABLED_QUANTITY_TYPES;

  // For the initial sync we want a wide window even when no anchor exists.
  const sinceFallback =
    opts.reason === "initial"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── Scalar samples ────────────────────────────────────────────────────────
  for (const type of types) {
    const anchor = await anchorStore.getQuantityAnchor(type);
    let pulled: SampleEnvelope[] = [];
    let newAnchor = anchor ?? "";
    try {
      const res = await provider.queryQuantitySamples({
        type,
        anchor,
        limit: 5000,
        sinceFallback,
      });
      pulled = res.samples;
      newAnchor = res.anchor || newAnchor;
    } catch (err: any) {
      result.errors.push(`query:${type}:${err?.message ?? "unknown"}`);
      continue;
    }

    if (pulled.length === 0) {
      await anchorStore.setQuantityLastSync(type, new Date().toISOString());
      if (newAnchor) await anchorStore.setQuantityAnchor(type, newAnchor);
      continue;
    }

    for (const batch of chunk(pulled, MAX_BATCH)) {
      try {
        const r = await patientApi.postWearableSamples({
          batch_id,
          sync_reason: opts.reason,
          samples: batch,
        });
        result.samples_accepted += r.accepted;
        result.samples_duplicates += r.duplicates;
        result.samples_rejected += r.rejected;
        result.samples_deleted += r.deleted ?? 0;
      } catch (err: any) {
        result.errors.push(`upload:${type}:${err?.message ?? "unknown"}`);
        // Do not advance the anchor — the next sync will retry from here.
        newAnchor = anchor ?? "";
        break;
      }
    }

    if (newAnchor) await anchorStore.setQuantityAnchor(type, newAnchor);
    await anchorStore.setQuantityLastSync(type, new Date().toISOString());
  }

  // ── Workouts ──────────────────────────────────────────────────────────────
  try {
    const since = (await anchorStore.getWorkoutsSince()) ?? sinceFallback.toISOString();
    const workouts: WorkoutEnvelope[] = await provider.queryWorkouts({
      since: new Date(since),
      limit: 500,
    });
    if (workouts.length > 0) {
      for (const batch of chunk(workouts, MAX_BATCH)) {
        try {
          const r = await patientApi.postWearableWorkouts({ batch_id, workouts: batch });
          result.workouts_accepted += r.accepted;
        } catch (err: any) {
          result.errors.push(`upload:workouts:${err?.message ?? "unknown"}`);
        }
      }
    }
    await anchorStore.setWorkoutsSince(new Date().toISOString());
  } catch (err: any) {
    result.errors.push(`query:workouts:${err?.message ?? "unknown"}`);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  try {
    const since = (await anchorStore.getSleepSince()) ?? sinceFallback.toISOString();
    const segments: SleepSegmentEnvelope[] = await provider.querySleep({
      since: new Date(since),
      limit: 2000,
    });
    if (segments.length > 0) {
      for (const batch of chunk(segments, MAX_BATCH)) {
        try {
          const r = await patientApi.postWearableSleep({ batch_id, segments: batch });
          result.sleep_accepted += r.accepted;
        } catch (err: any) {
          result.errors.push(`upload:sleep:${err?.message ?? "unknown"}`);
        }
      }
    }
    await anchorStore.setSleepSince(new Date().toISOString());
  } catch (err: any) {
    result.errors.push(`query:sleep:${err?.message ?? "unknown"}`);
  }

  await anchorStore.setLastFullSync(new Date().toISOString());
  result.duration_ms = Date.now() - t0;
  return result;
}
