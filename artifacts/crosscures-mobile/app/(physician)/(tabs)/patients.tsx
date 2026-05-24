import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { physicianApi } from "@/lib/api";

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["physician-patients"],
    queryFn: () => physicianApi.getPatients(),
  });
  const items: any[] = Array.isArray(q.data) ? q.data : (q.data as any)?.patients ?? [];
  const filtered = search
    ? items.filter((p: any) =>
        (p.full_name ?? p.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <ScreenHeader title="Patients" subtitle={`${items.length} total`} />
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search patients"
            placeholderTextColor={colors.mutedForeground}
            style={{
              flex: 1,
              paddingVertical: 12,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
            }}
          />
        </View>
      </View>
      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState icon="users" title="No patients" subtitle="Patients linked to your practice will appear here." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p: any) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(physician)/patient/${item.id}`)}>
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.brand100,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                      {(item.full_name ?? item.name ?? "?")
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                      {item.full_name ?? item.name ?? "Patient"}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                      {item.email ?? item.last_seen ?? ""}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
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
