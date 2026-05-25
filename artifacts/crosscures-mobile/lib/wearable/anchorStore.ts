import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CanonicalQuantityType } from "./types";

const ANCHOR_PREFIX = "crosscures_wearable_anchor_";
const LAST_SYNC_PREFIX = "crosscures_wearable_last_sync_";
const LAST_FULL_SYNC_KEY = "crosscures_wearable_last_full_sync";
const WORKOUTS_ANCHOR_KEY = "crosscures_wearable_workouts_since";
const SLEEP_ANCHOR_KEY = "crosscures_wearable_sleep_since";

async function get(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
async function set(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

export const anchorStore = {
  getQuantityAnchor: (type: CanonicalQuantityType) => get(ANCHOR_PREFIX + type),
  setQuantityAnchor: (type: CanonicalQuantityType, anchor: string) => set(ANCHOR_PREFIX + type, anchor),

  getQuantityLastSync: (type: CanonicalQuantityType) => get(LAST_SYNC_PREFIX + type),
  setQuantityLastSync: (type: CanonicalQuantityType, iso: string) => set(LAST_SYNC_PREFIX + type, iso),

  getWorkoutsSince: () => get(WORKOUTS_ANCHOR_KEY),
  setWorkoutsSince: (iso: string) => set(WORKOUTS_ANCHOR_KEY, iso),

  getSleepSince: () => get(SLEEP_ANCHOR_KEY),
  setSleepSince: (iso: string) => set(SLEEP_ANCHOR_KEY, iso),

  getLastFullSync: () => get(LAST_FULL_SYNC_KEY),
  setLastFullSync: (iso: string) => set(LAST_FULL_SYNC_KEY, iso),

  async clearAll(types: CanonicalQuantityType[]): Promise<void> {
    const keys = [
      ...types.map((t) => ANCHOR_PREFIX + t),
      ...types.map((t) => LAST_SYNC_PREFIX + t),
      WORKOUTS_ANCHOR_KEY,
      SLEEP_ANCHOR_KEY,
      LAST_FULL_SYNC_KEY,
    ];
    try { await AsyncStorage.multiRemove(keys); } catch {}
  },
};
