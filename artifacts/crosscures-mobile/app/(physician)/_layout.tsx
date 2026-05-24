import { Redirect, Stack } from "expo-router";
import React from "react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function PhysicianLayout() {
  const colors = useColors();
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "physician") {
    return <Redirect href="/(patient)/(tabs)/home" />;
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="patient/[id]" options={{ title: "Patient" }} />
      <Stack.Screen name="brief/[id]" options={{ title: "Brief" }} />
      <Stack.Screen name="alert/[id]" options={{ title: "Alert" }} />
    </Stack>
  );
}
