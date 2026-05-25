import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { useAuth } from "@/lib/auth";
import { patientApi } from "@/lib/api";
import { getWearableProvider } from "./index";
import { syncOnce, type SyncReason, type SyncResult } from "./sync";
import { ENABLED_QUANTITY_TYPES, BACKGROUND_DELIVERY_TYPES } from "./types";
import { anchorStore } from "./anchorStore";

const FOREGROUND_DEBOUNCE_MS = 15 * 60 * 1000; // 15 min
const BACKGROUND_TASK_NAME = "crosscures-wearable-sync";

interface WearableSyncState {
  enabled: boolean;
  available: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastResult: SyncResult | null;
  triggerSync: (reason?: SyncReason) => Promise<SyncResult | null>;
  enableSync: () => Promise<{ ok: boolean; reason?: string }>;
  disableSync: () => Promise<void>;
}

const WearableSyncContext = createContext<WearableSyncState | null>(null);

export function WearableSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, token, hydrated } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const inflight = useRef(false);

  const isPatient = !!user && user.role === "patient" && !!token;

  // Probe provider availability + cached last sync once on mount / when role changes.
  useEffect(() => {
    if (!hydrated || !isPatient) {
      setAvailable(false);
      setEnabled(false);
      return;
    }
    (async () => {
      try {
        const provider = getWearableProvider();
        setAvailable(await provider.isAvailable());
      } catch {
        setAvailable(false);
      }
      try {
        const consents: any = await patientApi.getConsents();
        const w = (consents?.consents ?? []).find(
          (c: any) => c.action === "WEARABLE_SYNC",
        );
        setEnabled(!!w?.granted && !w?.revoked_at);
      } catch {
        setEnabled(false);
      }
      try {
        const last = await anchorStore.getLastFullSync();
        setLastSyncedAt(last);
      } catch {}
    })();
  }, [hydrated, isPatient]);

  const triggerSync = useCallback(
    async (reason: SyncReason = "manual"): Promise<SyncResult | null> => {
      if (!isPatient || !enabled || !available || inflight.current) return null;
      inflight.current = true;
      setSyncing(true);
      try {
        const res = await syncOnce({ reason });
        setLastResult(res);
        setLastSyncedAt(new Date().toISOString());
        return res;
      } finally {
        inflight.current = false;
        setSyncing(false);
      }
    },
    [isPatient, enabled, available],
  );

  // Foreground trigger: when the app becomes active and we haven't synced recently.
  useEffect(() => {
    if (!isPatient || !enabled) return;
    const handler = async (next: AppStateStatus) => {
      if (next !== "active") return;
      const lastIso = await anchorStore.getLastFullSync();
      if (lastIso && Date.now() - new Date(lastIso).getTime() < FOREGROUND_DEBOUNCE_MS) return;
      triggerSync("foreground").catch(() => {});
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [isPatient, enabled, triggerSync]);

  // Background fetch registration. Best-effort — we don't surface failures.
  useEffect(() => {
    if (!isPatient || !enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const BackgroundFetch = require("expo-background-fetch");
        const TaskManager = require("expo-task-manager");
        if (!TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
          TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
            try {
              const res = await syncOnce({ reason: "background" });
              return res.samples_accepted + res.workouts_accepted + res.sleep_accepted > 0
                ? BackgroundFetch.BackgroundFetchResult.NewData
                : BackgroundFetch.BackgroundFetchResult.NoData;
            } catch {
              return BackgroundFetch.BackgroundFetchResult.Failed;
            }
          });
        }
        if (cancelled) return;
        await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
          minimumInterval: 30 * 60, // 30 min
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch {
        // Background fetch is optional — foreground + observer cover most updates.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPatient, enabled]);

  const enableSync = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!isPatient) return { ok: false, reason: "not_patient" };
    const provider = getWearableProvider();
    if (!(await provider.isAvailable())) {
      return { ok: false, reason: "platform_unavailable" };
    }
    try {
      await patientApi.grantConsent("WEARABLE_SYNC");
    } catch (e: any) {
      return { ok: false, reason: `consent:${e?.message ?? "failed"}` };
    }
    const perm = await provider.requestPermissions(ENABLED_QUANTITY_TYPES);
    if (perm.granted.length === 0) {
      // Roll back the backend consent — user denied everything on the device.
      try { await patientApi.revokeConsent("WEARABLE_SYNC"); } catch {}
      return { ok: false, reason: "all_denied" };
    }
    if (Platform.OS === "ios") {
      provider.enableBackgroundDelivery(BACKGROUND_DELIVERY_TYPES).catch(() => {});
    }
    setEnabled(true);
    setAvailable(true);
    // Kick off the initial backfill in the background — UI does not block on it.
    syncOnce({ reason: "initial" })
      .then((res) => {
        setLastResult(res);
        setLastSyncedAt(new Date().toISOString());
      })
      .catch(() => {});
    return { ok: true };
  }, [isPatient]);

  const disableSync = useCallback(async (): Promise<void> => {
    if (!isPatient) return;
    try { await patientApi.revokeConsent("WEARABLE_SYNC"); } catch {}
    await anchorStore.clearAll(ENABLED_QUANTITY_TYPES);
    try {
      const BackgroundFetch = require("expo-background-fetch");
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    } catch {}
    setEnabled(false);
    setLastSyncedAt(null);
    setLastResult(null);
  }, [isPatient]);

  const value = useMemo<WearableSyncState>(
    () => ({
      enabled,
      available,
      syncing,
      lastSyncedAt,
      lastResult,
      triggerSync,
      enableSync,
      disableSync,
    }),
    [enabled, available, syncing, lastSyncedAt, lastResult, triggerSync, enableSync, disableSync],
  );

  return <WearableSyncContext.Provider value={value}>{children}</WearableSyncContext.Provider>;
}

export function useWearableSync(): WearableSyncState {
  const ctx = useContext(WearableSyncContext);
  if (!ctx) throw new Error("useWearableSync must be used within WearableSyncProvider");
  return ctx;
}
