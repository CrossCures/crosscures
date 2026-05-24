import { Redirect, Stack } from "expo-router";
import React from "react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function PatientLayout() {
  const colors = useColors();
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "patient") {
    return <Redirect href="/(physician)/(tabs)/dashboard" />;
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="clinic" options={{ title: "Clinic with Maria" }} />
      <Stack.Screen name="previsit" options={{ title: "Pre-visit call" }} />
      <Stack.Screen name="report" options={{ title: "Health report" }} />
      <Stack.Screen name="records" options={{ title: "Health records" }} />
    </Stack>
  );
}
