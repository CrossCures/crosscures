import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "physician") return <Redirect href="/(physician)/(tabs)/dashboard" />;
  return <Redirect href="/(patient)/(tabs)/home" />;
}
