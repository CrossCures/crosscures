import { useLocalSearchParams, Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";

import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { patientApi, type WearableSeries } from "@/lib/api";

const RANGES = [
  { key: "7d", label: "7d", days: 7, bucket: "day" as const },
  { key: "30d", label: "30d", days: 30, bucket: "day" as const },
  { key: "90d", label: "90d", days: 90, bucket: "day" as const },
  { key: "24h", label: "24h", days: 1, bucket: "hour" as const },
];

const METRIC_LABELS: Record<string, string> = {
  heart_rate: "Heart rate",
  resting_heart_rate: "Resting heart rate",
  heart_rate_variability_sdnn: "Heart rate variability",
  oxygen_saturation: "Blood oxygen",
  respiratory_rate: "Respiratory rate",
  body_mass: "Weight",
  body_temperature: "Body temperature",
  blood_glucose: "Blood glucose",
  step_count: "Steps",
  distance_walking_running: "Walking distance",
  active_energy_burned: "Active energy",
};

export default function MetricDetail() {
  const colors = useColors();
  const { metric } = useLocalSearchParams<{ metric: string }>();
  const [rangeKey, setRangeKey] = useState("30d");
  const range = RANGES.find((r) => r.key === rangeKey)!;

  const from = useMemo(
    () => new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString(),
    [range.days],
  );
  const to = useMemo(() => new Date().toISOString(), [rangeKey]);

  const q = useQuery<WearableSeries>({
    queryKey: ["wearable", "series", metric, rangeKey],
    queryFn: () => patientApi.getWearableSeries({ quantity_type: metric as string, from, to, bucket: range.bucket }),
    enabled: !!metric,
  });

  const title = METRIC_LABELS[metric as string] ?? (metric as string);
  const series = q.data?.series ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ title }} />

      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRangeKey(r.key)}
            style={[
              styles.rangeBtn,
              {
                backgroundColor: rangeKey === r.key ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{
              color: rangeKey === r.key ? colors.primaryForeground : colors.foreground,
              fontFamily: "Inter_500Medium",
            }}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : series.length === 0 ? (
          <Text style={{ fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            No data in this window.
          </Text>
        ) : (
          <MiniChart series={series} unit={q.data?.unit ?? ""} colors={colors} />
        )}
      </Card>

      {series.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Stats</Text>
          <Stat label="Average" value={`${formatStat(avg(series))} ${q.data?.unit ?? ""}`} colors={colors} />
          <Stat label="Min" value={`${formatStat(Math.min(...series.map((s) => s.min)))} ${q.data?.unit ?? ""}`} colors={colors} />
          <Stat label="Max" value={`${formatStat(Math.max(...series.map((s) => s.max)))} ${q.data?.unit ?? ""}`} colors={colors} />
          <Stat label="Samples" value={`${series.reduce((acc, s) => acc + s.count, 0)}`} colors={colors} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.kv}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{value}</Text>
    </View>
  );
}

function MiniChart({
  series,
  unit,
  colors,
}: {
  series: { t: string; avg: number; min: number; max: number }[];
  unit: string;
  colors: ReturnType<typeof useColors>;
}) {
  const width = 320;
  const height = 180;
  const padding = 24;

  const ys = series.map((p) => p.avg);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = Math.max(yMax - yMin, 1);

  const points = series.map((p, i) => {
    const x = padding + (i / Math.max(series.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((p.avg - yMin) / yRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.border} />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} />
        <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} />
        <SvgText x={padding + 4} y={padding + 10} fontSize="10" fill={colors.mutedForeground}>
          {formatStat(yMax)} {unit}
        </SvgText>
        <SvgText x={padding + 4} y={height - padding - 4} fontSize="10" fill={colors.mutedForeground}>
          {formatStat(yMin)} {unit}
        </SvgText>
      </Svg>
    </View>
  );
}

function avg(s: { avg: number }[]): number {
  if (s.length === 0) return 0;
  return s.reduce((acc, x) => acc + x.avg, 0) / s.length;
}

function formatStat(n: number): string {
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  if (Math.abs(n) >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  rangeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 8 },
});
