import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { physicianApi } from "@/lib/api";

export default function AlertsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ["physician-dashboard"],
    queryFn: () => physicianApi.getDashboard(),
  });
  const data: any = q.data ?? {};
  const alerts: any[] = data.recent_alerts ?? data.alerts ?? [];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <ScreenHeader title="Therapy alerts" />
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : alerts.length === 0 ? (
        <EmptyState icon="bell" title="No alerts" subtitle="You'll be notified of therapy deviations here." />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a: any) => String(a.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const sev = (item.severity ?? "low") as string;
            const bg = sev === "high" ? "#fee2e2" : sev === "medium" ? "#fef3c7" : "#e0f2fe";
            const fg = sev === "high" ? "#b91c1c" : sev === "medium" ? "#b45309" : "#0369a1";
            return (
              <Pressable onPress={() => router.push(`/(physician)/alert/${item.id}`)}>
                <Card style={{ marginBottom: 8 }} padding={14}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="alert-triangle" size={18} color={fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                        {item.title ?? item.patient_name ?? "Alert"}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                        {item.message ?? item.summary ?? ""}
                      </Text>
                    </View>
                    <Pill
                      label={sev.toUpperCase()}
                      tone={sev === "high" ? "danger" : sev === "medium" ? "warning" : "neutral"}
                    />
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
