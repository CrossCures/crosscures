import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { physicianApi } from "@/lib/api";

export default function BriefDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["brief", id],
    queryFn: () => physicianApi.getBrief(id!),
    enabled: !!id,
  });

  const ack = useMutation({
    mutationFn: () => physicianApi.acknowledgeBrief(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["physician-dashboard"] });
      qc.invalidateQueries({ queryKey: ["brief", id] });
      Alert.alert("Acknowledged", "Brief marked as read.");
      router.back();
    },
    onError: (err: any) => Alert.alert("Failed", err?.message ?? "Try again."),
  });

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const b: any = q.data ?? {};
  const citations: any[] = b.citations ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card padding={18} style={{ marginBottom: 12 }}>
        <Text style={[styles.h1, { color: colors.foreground }]}>
          {b.patient_name ?? "Patient"}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {b.appointment_date ? new Date(b.appointment_date).toLocaleString() : ""}
        </Text>
        {b.summary ? (
          <Text style={[styles.body, { color: colors.foreground }]}>{b.summary}</Text>
        ) : null}
      </Card>

      {b.key_points?.length ? (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <Text style={[styles.section, { color: colors.foreground }]}>Key points</Text>
          {b.key_points.map((p: string, i: number) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>•</Text>
              <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                {p}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {citations.length ? (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <Text style={[styles.section, { color: colors.foreground }]}>Citations</Text>
          {citations.map((c: any, i: number) => (
            <View key={i} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {c.title ?? c.source ?? "Source"}
              </Text>
              {c.snippet ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                  {c.snippet}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {!b.read ? (
        <Button title="Mark as read" onPress={() => ack.mutate()} loading={ack.isPending} />
      ) : (
        <View style={{ alignItems: "center", padding: 12 }}>
          <Pill label="Acknowledged" tone="success" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 20, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 12, lineHeight: 21 },
  section: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
