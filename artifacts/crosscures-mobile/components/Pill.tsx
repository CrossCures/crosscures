import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type PillTone = "neutral" | "success" | "warning" | "danger" | "info";

export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  const colors = useColors();
  const map = {
    neutral: { bg: colors.muted, fg: colors.mutedForeground },
    success: { bg: "#dcfce7", fg: "#15803d" },
    warning: { bg: "#fef3c7", fg: "#b45309" },
    danger: { bg: "#fee2e2", fg: "#b91c1c" },
    info: { bg: colors.brand100, fg: colors.brand700 },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={[styles.text, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
});
