import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { physicianApi } from "@/lib/api";

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const briefsQ = useQuery({
    queryKey: ["patient-briefs", id],
    queryFn: () => physicianApi.getPatientBriefs(id!),
    enabled: !!id,
  });
  const alertsQ = useQuery({
    queryKey: ["patient-alerts", id],
    queryFn: () => physicianApi.getPatientAlerts(id!),
    enabled: !!id,
  });

  const briefs: any[] = Array.isArray(briefsQ.data) ? briefsQ.data : (briefsQ.data as any)?.briefs ?? [];
  const alerts: any[] = Array.isArray(alertsQ.data) ? alertsQ.data : (alertsQ.data as any)?.alerts ?? [];

  if (briefsQ.isLoading || alertsQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[styles.section, { color: colors.foreground }]}>Pre-visit briefs</Text>
      {briefs.length === 0 ? (
        <Card padding={16} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            No briefs for this patient yet.
          </Text>
        </Card>
      ) : (
        briefs.map((b: any) => (
          <Pressable key={b.id} onPress={() => router.push(`/(physician)/brief/${b.id}`)}>
            <Card style={{ marginBottom: 8 }} padding={14}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Feather name="file-text" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {b.title ?? b.appointment_reason ?? "Brief"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                    {b.created_at ? new Date(b.created_at).toLocaleDateString() : ""}
                  </Text>
                </View>
                {!b.read && <Pill label="NEW" tone="info" />}
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <Text style={[styles.section, { color: colors.foreground, marginTop: 16 }]}>Alerts</Text>
      {alerts.length === 0 ? (
        <EmptyState icon="bell" title="No alerts" subtitle="This patient has no open alerts." />
      ) : (
        alerts.map((a: any) => (
          <Pressable key={a.id} onPress={() => router.push(`/(physician)/alert/${a.id}`)}>
            <Card style={{ marginBottom: 8 }} padding={14}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Feather name="alert-triangle" size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {a.title ?? "Alert"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                    {a.message ?? ""}
                  </Text>
                </View>
                <Pill
                  label={(a.severity ?? "low").toUpperCase()}
                  tone={a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "neutral"}
                />
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
