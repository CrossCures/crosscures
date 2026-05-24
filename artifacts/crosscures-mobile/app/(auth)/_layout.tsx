import { Redirect, Stack } from "expo-router";
import React from "react";

import { useAuth } from "@/lib/auth";

export default function AuthLayout() {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (user) {
    return (
      <Redirect
        href={
          user.role === "physician"
            ? "/(physician)/(tabs)/dashboard"
            : "/(patient)/(tabs)/home"
        }
      />
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
