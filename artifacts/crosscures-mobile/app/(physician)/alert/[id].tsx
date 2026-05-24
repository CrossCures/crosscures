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

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["alert", id],
    queryFn: () => physicianApi.getAlert(id!),
    enabled: !!id,
  });

  const ack = useMutation({
    mutationFn: () => physicianApi.acknowledgeAlert(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["physician-dashboard"] });
      Alert.alert("Acknowledged", "Alert marked as resolved.");
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

  const a: any = q.data ?? {};
  const sev = a.severity ?? "low";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card padding={18} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.h1, { color: colors.foreground }]}>
            {a.title ?? "Alert"}
          </Text>
          <Pill
            label={sev.toUpperCase()}
            tone={sev === "high" ? "danger" : sev === "medium" ? "warning" : "neutral"}
          />
        </View>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
        </Text>
        {a.patient_name ? (
          <Text style={{ marginTop: 8, color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
            {a.patient_name}
          </Text>
        ) : null}
        {a.message ? (
          <Text style={[styles.body, { color: colors.foreground }]}>{a.message}</Text>
        ) : null}
      </Card>

      {a.details ? (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <Text style={[styles.section, { color: colors.foreground }]}>Details</Text>
          <Text style={{ marginTop: 6, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
            {typeof a.details === "string" ? a.details : JSON.stringify(a.details, null, 2)}
          </Text>
        </Card>
      ) : null}

      {!a.acknowledged ? (
        <Button title="Acknowledge alert" onPress={() => ack.mutate()} loading={ack.isPending} />
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
