import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { authApi, patientApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const [physicianEmail, setPhysicianEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => patientApi.getProfile(),
  });
  const consentQ = useQuery({
    queryKey: ["consents"],
    queryFn: () => patientApi.getConsents(),
  });

  const toggleConsent = useMutation({
    mutationFn: ({ action, on }: { action: string; on: boolean }) =>
      on ? patientApi.grantConsent(action) : patientApi.revokeConsent(action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consents"] }),
  });

  const consents: any[] = Array.isArray(consentQ.data) ? consentQ.data : (consentQ.data as any)?.consents ?? [];

  const link = async () => {
    if (!physicianEmail) return;
    setLinking(true);
    try {
      await authApi.linkPhysician(physicianEmail.trim());
      Alert.alert("Linked", "Your physician request has been sent.");
      setPhysicianEmail("");
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: 40 }}
    >
      <ScreenHeader title="Settings" />
      <View style={{ padding: 16 }}>
        <Card style={{ marginBottom: 16 }} padding={18}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: colors.brand100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="user" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {user?.full_name ?? "—"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                {user?.email}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.section, { color: colors.foreground }]}>Care team</Text>
        <Card style={{ marginBottom: 16 }} padding={16}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Link your physician by email
          </Text>
          <Input
            value={physicianEmail}
            onChangeText={setPhysicianEmail}
            placeholder="physician@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Send link request" onPress={link} loading={linking} />
        </Card>

        <Text style={[styles.section, { color: colors.foreground }]}>Privacy</Text>
        <Card padding={4} style={{ marginBottom: 16 }}>
          {consentQ.isLoading ? (
            <View style={{ padding: 16 }}>
              <ActivityIndicator />
            </View>
          ) : consents.length ? (
            consents.map((c: any, idx: number) => (
              <View
                key={c.action ?? idx}
                style={[
                  styles.consentRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                    {c.label ?? c.action}
                  </Text>
                  {c.description ? (
                    <Text
                      style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}
                    >
                      {c.description}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={!!c.granted}
                  onValueChange={(v) =>
                    toggleConsent.mutate({ action: c.action, on: v })
                  }
                />
              </View>
            ))
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                No consent settings available.
              </Text>
            </View>
          )}
        </Card>

        <Button
          title="Sign out"
          variant="destructive"
          onPress={() => {
            Alert.alert("Sign out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out", style: "destructive", onPress: () => signOut() },
            ]);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
});
