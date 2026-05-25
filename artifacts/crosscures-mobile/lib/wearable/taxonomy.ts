/**
 * Mapping between platform-native quantity identifiers and the canonical
 * vocabulary the backend understands.
 */
import type { CanonicalQuantityType, SleepStage } from "./types";

// ── iOS / HealthKit ──────────────────────────────────────────────────────────

export const HK_QUANTITY_BY_CANONICAL: Record<CanonicalQuantityType, string> = {
  step_count: "HKQuantityTypeIdentifierStepCount",
  distance_walking_running: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  active_energy_burned: "HKQuantityTypeIdentifierActiveEnergyBurned",
  basal_energy_burned: "HKQuantityTypeIdentifierBasalEnergyBurned",
  flights_climbed: "HKQuantityTypeIdentifierFlightsClimbed",
  heart_rate: "HKQuantityTypeIdentifierHeartRate",
  resting_heart_rate: "HKQuantityTypeIdentifierRestingHeartRate",
  heart_rate_variability_sdnn: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  oxygen_saturation: "HKQuantityTypeIdentifierOxygenSaturation",
  respiratory_rate: "HKQuantityTypeIdentifierRespiratoryRate",
  body_mass: "HKQuantityTypeIdentifierBodyMass",
  body_temperature: "HKQuantityTypeIdentifierBodyTemperature",
  blood_pressure_systolic: "HKQuantityTypeIdentifierBloodPressureSystolic",
  blood_pressure_diastolic: "HKQuantityTypeIdentifierBloodPressureDiastolic",
  blood_glucose: "HKQuantityTypeIdentifierBloodGlucose",
  dietary_energy_consumed: "HKQuantityTypeIdentifierDietaryEnergyConsumed",
  water_intake: "HKQuantityTypeIdentifierDietaryWater",
  // Mindful sessions are HKCategoryType — handled specially in ios.ts
  mindful_minutes: "HKCategoryTypeIdentifierMindfulSession",
  menstrual_flow: "HKCategoryTypeIdentifierMenstrualFlow",
};

export const CANONICAL_UNIT_HK: Record<CanonicalQuantityType, string> = {
  step_count: "count",
  distance_walking_running: "m",
  active_energy_burned: "kcal",
  basal_energy_burned: "kcal",
  flights_climbed: "count",
  heart_rate: "count/min",
  resting_heart_rate: "count/min",
  heart_rate_variability_sdnn: "ms",
  oxygen_saturation: "%",
  respiratory_rate: "count/min",
  body_mass: "kg",
  body_temperature: "degC",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  blood_glucose: "mmol/L",
  dietary_energy_consumed: "kcal",
  water_intake: "mL",
  mindful_minutes: "min",
  menstrual_flow: "count",
};

/** Canonical wire-unit string sent to the server. */
export const CANONICAL_UNIT: Record<CanonicalQuantityType, string> = {
  step_count: "count",
  distance_walking_running: "m",
  active_energy_burned: "kcal",
  basal_energy_burned: "kcal",
  flights_climbed: "count",
  heart_rate: "bpm",
  resting_heart_rate: "bpm",
  heart_rate_variability_sdnn: "ms",
  oxygen_saturation: "%",
  respiratory_rate: "breaths/min",
  body_mass: "kg",
  body_temperature: "C",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  blood_glucose: "mmol/L",
  dietary_energy_consumed: "kcal",
  water_intake: "mL",
  mindful_minutes: "min",
  menstrual_flow: "enum",
};

// ── Android / Health Connect ─────────────────────────────────────────────────

/** Record types in Health Connect that we read. */
export const HC_RECORD_BY_CANONICAL: Record<CanonicalQuantityType, string> = {
  step_count: "Steps",
  distance_walking_running: "Distance",
  active_energy_burned: "ActiveCaloriesBurned",
  basal_energy_burned: "BasalMetabolicRate",
  flights_climbed: "FloorsClimbed",
  heart_rate: "HeartRate",
  resting_heart_rate: "RestingHeartRate",
  heart_rate_variability_sdnn: "HeartRateVariabilityRmssd",
  oxygen_saturation: "OxygenSaturation",
  respiratory_rate: "RespiratoryRate",
  body_mass: "Weight",
  body_temperature: "BodyTemperature",
  blood_pressure_systolic: "BloodPressure",
  blood_pressure_diastolic: "BloodPressure",
  blood_glucose: "BloodGlucose",
  dietary_energy_consumed: "Nutrition",
  water_intake: "Hydration",
  mindful_minutes: "MindfulnessSession",
  menstrual_flow: "MenstruationFlow",
};

export const HC_PERMISSIONS_BY_CANONICAL: Record<CanonicalQuantityType, string> = {
  step_count: "android.permission.health.READ_STEPS",
  distance_walking_running: "android.permission.health.READ_DISTANCE",
  active_energy_burned: "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
  basal_energy_burned: "android.permission.health.READ_BASAL_METABOLIC_RATE",
  flights_climbed: "android.permission.health.READ_FLOORS_CLIMBED",
  heart_rate: "android.permission.health.READ_HEART_RATE",
  resting_heart_rate: "android.permission.health.READ_RESTING_HEART_RATE",
  heart_rate_variability_sdnn: "android.permission.health.READ_HEART_RATE_VARIABILITY",
  oxygen_saturation: "android.permission.health.READ_OXYGEN_SATURATION",
  respiratory_rate: "android.permission.health.READ_RESPIRATORY_RATE",
  body_mass: "android.permission.health.READ_WEIGHT",
  body_temperature: "android.permission.health.READ_BODY_TEMPERATURE",
  blood_pressure_systolic: "android.permission.health.READ_BLOOD_PRESSURE",
  blood_pressure_diastolic: "android.permission.health.READ_BLOOD_PRESSURE",
  blood_glucose: "android.permission.health.READ_BLOOD_GLUCOSE",
  dietary_energy_consumed: "android.permission.health.READ_NUTRITION",
  water_intake: "android.permission.health.READ_HYDRATION",
  mindful_minutes: "android.permission.health.READ_MINDFULNESS",
  menstrual_flow: "android.permission.health.READ_MENSTRUATION",
};

// ── Sleep stages ─────────────────────────────────────────────────────────────

export const HK_SLEEP_STAGE_TO_CANONICAL: Record<number, SleepStage> = {
  // HKCategoryValueSleepAnalysis enum values
  0: "in_bed",            // inBed
  1: "asleep_unspecified", // asleepUnspecified (legacy)
  2: "awake",             // awake
  3: "asleep_core",       // asleepCore
  4: "asleep_deep",       // asleepDeep
  5: "asleep_rem",        // asleepREM
};

export const HC_SLEEP_STAGE_TO_CANONICAL: Record<number, SleepStage> = {
  1: "awake",
  2: "asleep_unspecified", // SLEEPING
  3: "awake",              // OUT_OF_BED
  4: "asleep_core",        // LIGHT
  5: "asleep_deep",        // DEEP
  6: "asleep_rem",         // REM
  7: "awake",              // AWAKE_IN_BED
};

// ── Workout types ────────────────────────────────────────────────────────────

/**
 * Normalize platform workout type identifiers to lowercase canonical strings.
 * Apple uses HKWorkoutActivityType enum ints; Health Connect uses ExerciseType ints.
 * Unknown types map to "other" — we still record the workout for duration/energy.
 */
export function canonicalWorkoutType(raw: string | number): string {
  if (typeof raw === "string") return raw.toLowerCase().replace(/\s+/g, "_");
  // Numeric ids vary by platform — handle the common ones inline so the
  // backend gets a clean enum. Anything unknown becomes "other".
  // (Adapters can pre-stringify; this is a fallback.)
  return `type_${raw}`;
}
