import type {
  AnchoredResult,
  CanonicalQuantityType,
  PermissionResult,
  SampleEnvelope,
  SleepSegmentEnvelope,
  WearableProvider,
  WorkoutEnvelope,
} from "./types";

/** No-op provider used on web and any unsupported platform. */
export class NoopProvider implements WearableProvider {
  readonly platform = "web" as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(): Promise<PermissionResult> {
    return { granted: [], denied: [] };
  }

  async grantedPermissions(): Promise<CanonicalQuantityType[]> {
    return [];
  }

  async queryQuantitySamples(): Promise<AnchoredResult<SampleEnvelope>> {
    return { samples: [], anchor: "" };
  }

  async queryWorkouts(): Promise<WorkoutEnvelope[]> {
    return [];
  }

  async querySleep(): Promise<SleepSegmentEnvelope[]> {
    return [];
  }

  async enableBackgroundDelivery(): Promise<void> {
    // no-op
  }
}
