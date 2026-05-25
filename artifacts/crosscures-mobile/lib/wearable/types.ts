/**
 * Canonical wire types for wearable data uploaded to the CrossCures backend.
 *
 * Platform-specific identifiers (HealthKit HKQuantityTypeIdentifier strings,
 * Health Connect Record names) are mapped to these canonical strings by the
 * adapter before upload. The backend never sees platform-specific vocabulary.
 */

export type CanonicalQuantityType =
  | "step_count"
  | "distance_walking_running"
  | "active_energy_burned"
  | "basal_energy_burned"
  | "flights_climbed"
  | "heart_rate"
  | "resting_heart_rate"
  | "heart_rate_variability_sdnn"
  | "oxygen_saturation"
  | "respiratory_rate"
  | "body_mass"
  | "body_temperature"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "blood_glucose"
  | "dietary_energy_consumed"
  | "water_intake"
  | "mindful_minutes"
  | "menstrual_flow";

export type SleepStage =
  | "in_bed"
  | "asleep_unspecified"
  | "asleep_core"
  | "asleep_deep"
  | "asleep_rem"
  | "awake";

export interface SampleEnvelope {
  sample_id: string;
  quantity_type: CanonicalQuantityType;
  value: number;
  unit: string;
  start_date: string; // ISO 8601
  end_date: string;
  source_name?: string;
  /** When true, instructs the server to delete the sample with this id. */
  deleted?: boolean;
}

export interface WorkoutEnvelope {
  sample_id: string;
  workout_type: string;
  start_date: string;
  end_date: string;
  duration_seconds: number;
  total_energy_kcal?: number;
  total_distance_m?: number;
  average_heart_rate?: number;
  source_name?: string;
  metadata?: Record<string, unknown>;
}

export interface SleepSegmentEnvelope {
  sample_id: string;
  session_id: string;
  stage: SleepStage;
  start_date: string;
  end_date: string;
  source_name?: string;
}

export interface AnchoredResult<T> {
  samples: T[];
  /** Opaque token the provider knows how to interpret on the next call. */
  anchor: string;
}

export interface PermissionResult {
  granted: CanonicalQuantityType[];
  denied: CanonicalQuantityType[];
}

export interface WearableProvider {
  readonly platform: "ios" | "android" | "web";

  isAvailable(): Promise<boolean>;

  requestPermissions(types: CanonicalQuantityType[]): Promise<PermissionResult>;

  grantedPermissions(): Promise<CanonicalQuantityType[]>;

  queryQuantitySamples(opts: {
    type: CanonicalQuantityType;
    anchor?: string | null;
    limit?: number;
    sinceFallback?: Date;
  }): Promise<AnchoredResult<SampleEnvelope>>;

  queryWorkouts(opts: { since?: Date; limit?: number }): Promise<WorkoutEnvelope[]>;

  querySleep(opts: { since?: Date; limit?: number }): Promise<SleepSegmentEnvelope[]>;

  enableBackgroundDelivery(types: CanonicalQuantityType[]): Promise<void>;
}

/**
 * Quantity types the app reads by default. Keep this list minimal — every entry
 * is shown to the user in the permissions sheet and lengthens the privacy
 * disclosure. Add types here only when they have a concrete consumer.
 */
export const ENABLED_QUANTITY_TYPES: CanonicalQuantityType[] = [
  "step_count",
  "distance_walking_running",
  "active_energy_burned",
  "basal_energy_burned",
  "flights_climbed",
  "heart_rate",
  "resting_heart_rate",
  "heart_rate_variability_sdnn",
  "oxygen_saturation",
  "respiratory_rate",
  "body_mass",
  "body_temperature",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "blood_glucose",
  "dietary_energy_consumed",
  "water_intake",
  "mindful_minutes",
  "menstrual_flow",
];

/** Types we enable observer-driven background delivery for on iOS. */
export const BACKGROUND_DELIVERY_TYPES: CanonicalQuantityType[] = [
  "heart_rate",
  "resting_heart_rate",
  "oxygen_saturation",
  "blood_pressure_systolic",
  "blood_glucose",
];
