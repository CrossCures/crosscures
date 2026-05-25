import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { patientApi, type WearableSummary } from "@/lib/api";
import { useWearableSync } from "@/lib/wearable/WearableSyncProvider";

const LATEST_LABELS: Record<string, { label: string; unit: string }> = {
  heart_rate: { label: "Heart rate", unit: "bpm" },
  resting_heart_rate: { label: "Resting HR", unit: "bpm" },
  heart_rate_variability_sdnn: { label: "HRV (SDNN)", unit: "ms" },
  oxygen_saturation: { label: "SpO2", unit: "%" },
  respiratory_rate: { label: "Respiration", unit: "br/min" },
  body_mass: { label: "Weight", unit: "kg" },
  body_temperature: { label: "Temp", unit: "C" },
  blood_glucose: { label: "Glucose", unit: "mmol/L" },
};

const TODAY_LABELS: Record<string, { label: string; unit: string; fmt?: (n: number) => string }> = {
  step_count: { label: "Steps", unit: "", fmt: (n) => Math.round(n).toLocaleString() },
  distance_walking_running: { label: "Distance", unit: "km", fmt: (n) => (n / 1000).toFixed(2) },
  active_energy_burned: { label: "Active energy", unit: "kcal", fmt: (n) => Math.round(n).toString() },
  flights_climbed: { label: "Floors", unit: "", fmt: (n) => Math.round(n).toString() },
  water_intake: { label: "Water", unit: "mL", fmt: (n) => Math.round(n).toString() },
};

export default function PatientHealth() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sync = useWearableSync();

  const summaryQ = useQuery<WearableSummary>({
    queryKey: ["wearable", "summary"],
    queryFn: () => patientApi.getWearableSummary(),
    enabled: sync.enabled,
  });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const onRefresh = async () => {
    if (sync.enabled) {
      await sync.triggerSync("manual");
      queryClient.invalidateQueries({ queryKey: ["wearable"] });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={sync.syncing || summaryQ.isFetching} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={["#0ea5e9", "#14b8a6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.title}>Health data</Text>
        <Text style={styles.subtitle}>From your Apple Health / Health Connect</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Sync status */}
        <Card style={{ marginBottom: 16 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {sync.enabled ? "Sync enabled" : "Sync disabled"}
              </Text>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {sync.lastSyncedAt ? `Last sync: ${formatRelative(sync.lastSyncedAt)}` : "Not yet synced"}
              </Text>
              {sync.lastResult ? (
                <Text style={[styles.smallMuted, { color: colors.mutedForeground }]}>
                  {sync.lastResult.samples_accepted} samples · {sync.lastResult.workouts_accepted} workouts · {sync.lastResult.sleep_accepted} sleep
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => sync.triggerSync("manual")}
              disabled={!sync.enabled || sync.syncing}
              style={[styles.syncBtn, { backgroundColor: colors.primary, opacity: sync.enabled && !sync.syncing ? 1 : 0.5 }]}
            >
              {sync.syncing ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Feather name="refresh-cw" size={18} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
        </Card>

        {!sync.enabled ? (
          <Card>
            <Text style={[styles.heading, { color: colors.foreground }]}>Connect your health data</Text>
            <Text style={[styles.body2, { color: colors.mutedForeground, marginTop: 8 }]}>
              Allow CrossCures to read steps, heart rate, sleep, and other vitals from your phone or smartwatch. Your physician sees trends — never raw individual data points without your consent.
            </Text>
            <Pressable
              onPress={() => router.push("/(patient)/(tabs)/settings")}
              style={[styles.cta, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Enable in Settings</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            <SectionHeader title="Latest readings" colors={colors} />
            <View style={styles.grid}>
              {Object.entries(LATEST_LABELS).map(([key, meta]) => {
                const v = summaryQ.data?.latest?.[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => router.push({ pathname: "/(patient)/health/[metric]", params: { metric: key } })}
                    style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{meta.label}</Text>
                    <Text style={[styles.tileValue, { color: colors.foreground }]}>
                      {v ? `${formatNumber(v.value)}` : "—"}
                      <Text style={[styles.tileUnit, { color: colors.mutedForeground }]}>
                        {v ? ` ${meta.unit}` : ""}
                      </Text>
                    </Text>
                    {v?.source ? (
                      <Text style={[styles.tileSource, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {v.source}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="Today" colors={colors} />
            <Card>
              {Object.entries(TODAY_LABELS).map(([key, meta]) => {
                const v = summaryQ.data?.today?.[key];
                return (
                  <View key={key} style={styles.kv}>
                    <Text style={[styles.kvLabel, { color: colors.mutedForeground }]}>{meta.label}</Text>
                    <Text style={[styles.kvValue, { color: colors.foreground }]}>
                      {v != null ? `${meta.fmt ? meta.fmt(v) : v.toFixed(1)}${meta.unit ? ` ${meta.unit}` : ""}` : "—"}
                    </Text>
                  </View>
                );
              })}
            </Card>

            <SectionHeader title="Last night's sleep" colors={colors} />
            <Card>
              {summaryQ.data?.last_night_sleep ? (
                <>
                  <Text style={[styles.value, { color: colors.foreground }]}>
                    {Math.floor(summaryQ.data.last_night_sleep.total_minutes / 60)}h{" "}
                    {Math.round(summaryQ.data.last_night_sleep.total_minutes % 60)}m
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    {Object.entries(summaryQ.data.last_night_sleep.stages ?? {}).map(([stage, mins]) => (
                      <View key={stage} style={styles.kv}>
                        <Text style={[styles.kvLabel, { color: colors.mutedForeground }]}>
                          {humanStage(stage)}
                        </Text>
                        <Text style={[styles.kvValue, { color: colors.foreground }]}>
                          {Math.round(mins)} min
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={[styles.body2, { color: colors.mutedForeground }]}>No sleep data for last night.</Text>
              )}
            </Card>

            <SectionHeader title="Recent workouts" colors={colors} />
            <Card>
              {(summaryQ.data?.recent_workouts ?? []).length === 0 ? (
                <Text style={[styles.body2, { color: colors.mutedForeground }]}>No workouts in the last 7 days.</Text>
              ) : (
                summaryQ.data!.recent_workouts.map((w) => (
                  <View key={w.sample_id} style={styles.workoutRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.value, { color: colors.foreground }]}>
                        {humanWorkout(w.workout_type)}
                      </Text>
                      <Text style={[styles.smallMuted, { color: colors.mutedForeground }]}>
                        {new Date(w.start_date).toLocaleString()} · {Math.round(w.duration_seconds / 60)} min
                        {w.total_energy_kcal ? ` · ${Math.round(w.total_energy_kcal)} kcal` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.section, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3600_000)} hr ago`;
  return new Date(iso).toLocaleDateString();
}

function humanStage(stage: string): string {
  return {
    in_bed: "In bed",
    asleep_unspecified: "Asleep",
    asleep_core: "Core",
    asleep_deep: "Deep",
    asleep_rem: "REM",
    awake: "Awake",
  }[stage] ?? stage;
}

function humanWorkout(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { color: "white", fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium", marginTop: 2 },
  body: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 12 },
  value: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 2 },
  smallMuted: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  syncBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
  heading: { fontFamily: "Inter_700Bold", fontSize: 18 },
  body2: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  cta: { borderRadius: 12, padding: 14, marginTop: 16, alignItems: "center" },
  ctaText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  section: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8, marginTop: 8, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  tile: {
    width: "33.333%",
    minWidth: 100,
    padding: 12,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: "30%",
  },
  tileLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  tileValue: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 4 },
  tileUnit: { fontFamily: "Inter_400Regular", fontSize: 12 },
  tileSource: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  kvLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  kvValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  workoutRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
  },
});
