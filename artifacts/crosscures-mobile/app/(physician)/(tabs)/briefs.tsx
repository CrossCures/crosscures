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

export default function BriefsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const q = useQuery({
    queryKey: ["physician-dashboard"],
    queryFn: () => physicianApi.getDashboard(),
  });
  const data: any = q.data ?? {};
  const briefs: any[] = data.recent_briefs ?? data.unread_briefs ?? data.briefs ?? [];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <ScreenHeader title="Pre-visit briefs" />
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : briefs.length === 0 ? (
        <EmptyState icon="file-text" title="No briefs" subtitle="New pre-visit briefs will appear here." />
      ) : (
        <FlatList
          data={briefs}
          keyExtractor={(b: any) => String(b.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(physician)/brief/${item.id}`)}>
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
                      {item.patient_name ?? "Patient"}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                      {item.summary ?? item.appointment_reason ?? "Tap to view"}
                    </Text>
                  </View>
                  {!item.read && <Pill label="NEW" tone="info" />}
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
