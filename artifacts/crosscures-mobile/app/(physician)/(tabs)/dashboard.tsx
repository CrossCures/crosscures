import { Feather } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { physicianApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PhysicianDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const q = useQuery({
    queryKey: ["physician-dashboard"],
    queryFn: () => physicianApi.getDashboard(),
  });

  const data: any = q.data ?? {};
  const unread = data.unread_briefs_count ?? data.unread_briefs?.length ?? 0;
  const alerts = data.open_alerts_count ?? data.alerts?.length ?? 0;
  const patientsCount = data.patients_count ?? data.patients?.length ?? 0;
  const recentBriefs: any[] = data.recent_briefs ?? data.unread_briefs ?? [];
  const recentAlerts: any[] = data.recent_alerts ?? data.alerts ?? [];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor="#fff" />}
    >
      <View style={[styles.hero, { paddingTop: topPad + 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Dr. {user?.full_name?.split(" ").slice(-1)[0] ?? ""}</Text>
            <Text style={styles.sub}>{user?.specialty ?? "Physician dashboard"}</Text>
          </View>
          <Pressable
            onPress={signOut}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="log-out" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <Stat label="Patients" value={patientsCount} icon="users" />
          <Stat label="Unread" value={unread} icon="mail" tone="info" />
          <Stat label="Alerts" value={alerts} icon="alert-triangle" tone="warn" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.section}>Latest briefs</Text>
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : recentBriefs.length === 0 ? (
          <Card padding={16}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
              No briefs yet.
            </Text>
          </Card>
        ) : (
          recentBriefs.slice(0, 5).map((b: any) => (
            <Pressable key={b.id} onPress={() => router.push(`/(physician)/brief/${b.id}`)}>
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: colors.brand100,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="file-text" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                      {b.patient_name ?? "Patient"}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                      {b.summary ?? b.appointment_reason ?? "View brief"}
                    </Text>
                  </View>
                  {!b.read && <Pill label="NEW" tone="info" />}
                </View>
              </Card>
            </Pressable>
          ))
        )}

        <Text style={[styles.section, { marginTop: 24 }]}>Open alerts</Text>
        {recentAlerts.length === 0 ? (
          <Card padding={16}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
              No alerts right now.
            </Text>
          </Card>
        ) : (
          recentAlerts.slice(0, 5).map((a: any) => (
            <Pressable key={a.id} onPress={() => router.push(`/(physician)/alert/${a.id}`)}>
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: severityBg(a.severity),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name="alert-triangle" size={18} color={severityFg(a.severity)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                      {a.title ?? a.patient_name ?? "Alert"}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                      {a.message ?? a.summary ?? ""}
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
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  tone?: "info" | "warn";
}) {
  const fg = tone === "warn" ? "#fbbf24" : tone === "info" ? "#38bdf8" : "#e2e8f0";
  return (
    <View style={[styles.stat]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={icon} size={14} color={fg} />
        <Text style={{ color: "#94a3b8", fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase" }}>
          {label}
        </Text>
      </View>
      <Text style={{ color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function severityBg(s: string) {
  if (s === "high") return "#fee2e2";
  if (s === "medium") return "#fef3c7";
  return "#e0f2fe";
}
function severityFg(s: string) {
  if (s === "high") return "#b91c1c";
  if (s === "medium") return "#b45309";
  return "#0369a1";
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#0f172a", paddingHorizontal: 20, paddingBottom: 24 },
  greeting: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  sub: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statRow: { flexDirection: "row", marginTop: 20, gap: 10 },
  stat: { flex: 1, backgroundColor: "#1e293b", padding: 12, borderRadius: 14 },
  body: { padding: 16, backgroundColor: "#f1f5f9", flex: 1 },
  section: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
