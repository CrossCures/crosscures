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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PatientHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const checkinQ = useQuery({
    queryKey: ["checkin-today"],
    queryFn: () => patientApi.getTodayCheckin(),
  });
  const apptQ = useQuery({
    queryKey: ["appointments"],
    queryFn: () => patientApi.getAppointments(),
  });
  const rxQ = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => patientApi.getPrescriptions(),
  });

  const refreshing =
    checkinQ.isFetching || apptQ.isFetching || rxQ.isFetching;

  const onRefresh = () => {
    checkinQ.refetch();
    apptQ.refetch();
    rxQ.refetch();
  };

  const checkinData: any = checkinQ.data;
  const completed = checkinData?.completed ?? false;
  const appointments: any[] = Array.isArray(apptQ.data) ? apptQ.data : (apptQ.data as any)?.appointments ?? [];
  const upcoming = appointments[0];
  const prescriptions: any[] = Array.isArray(rxQ.data) ? rxQ.data : (rxQ.data as any)?.prescriptions ?? [];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={["#0ea5e9", "#14b8a6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.hi}>Hi, {user?.full_name?.split(" ")[0] ?? "there"}</Text>
        <Text style={styles.tagline}>How are you feeling today?</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Today's check-in CTA */}
        <Pressable
          onPress={() => router.push("/(patient)/(tabs)/checkin")}
          style={{ marginBottom: 16 }}
        >
          <Card padding={18}>
            <View style={styles.row}>
              <View style={[styles.iconBubble, { backgroundColor: colors.brand100 }]}>
                <Feather name="activity" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  Today's check-in
                </Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  {completed ? "Completed — great work!" : "Takes about 2 minutes"}
                </Text>
              </View>
              {completed ? (
                <Pill label="DONE" tone="success" />
              ) : (
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
              )}
            </View>
          </Card>
        </Pressable>

        {/* Quick actions */}
        <Text style={[styles.section, { color: colors.foreground }]}>Quick actions</Text>
        <View style={styles.grid}>
          <QuickAction
            icon="mic"
            label="Maria"
            color="#0ea5e9"
            onPress={() => router.push("/(patient)/clinic")}
          />
          <QuickAction
            icon="phone"
            label="Pre-visit"
            color="#14b8a6"
            onPress={() => router.push("/(patient)/previsit")}
          />
          <QuickAction
            icon="file-text"
            label="Report"
            color="#8b5cf6"
            onPress={() => router.push("/(patient)/report")}
          />
          <QuickAction
            icon="folder"
            label="Records"
            color="#f59e0b"
            onPress={() => router.push("/(patient)/records")}
          />
        </View>

        {/* Upcoming appointment */}
        <Text style={[styles.section, { color: colors.foreground, marginTop: 24 }]}>
          Upcoming appointment
        </Text>
        {apptQ.isLoading ? (
          <Card padding={20}>
            <ActivityIndicator />
          </Card>
        ) : upcoming ? (
          <Card padding={18}>
            <View style={styles.row}>
              <View style={[styles.iconBubble, { backgroundColor: colors.brand100 }]}>
                <Feather name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {upcoming.physician_name ?? "Your physician"}
                </Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  {formatDate(upcoming.appointment_date)}
                </Text>
                {upcoming.location ? (
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {upcoming.location}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        ) : (
          <Card padding={18}>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              No upcoming appointments scheduled.
            </Text>
          </Card>
        )}

        {/* Active prescriptions count */}
        <Text style={[styles.section, { color: colors.foreground, marginTop: 24 }]}>
          Your therapy
        </Text>
        <Card padding={18}>
          <View style={styles.row}>
            <View style={[styles.iconBubble, { backgroundColor: "#dcfce7" }]}>
              <Feather name="package" size={20} color="#15803d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {prescriptions.length} active medication
                {prescriptions.length === 1 ? "" : "s"}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Tap the Meds tab to manage your plan
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ width: "48%" }}>
      <Card padding={16}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: color + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 10, color: colors.foreground }}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

function formatDate(s: string | undefined): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  hi: { color: "#ffffff", fontSize: 26, fontFamily: "Inter_700Bold" },
  tagline: { color: "#e0f7ff", fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  body: { paddingHorizontal: 16, marginTop: -12 },
  section: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
