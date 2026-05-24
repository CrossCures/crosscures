import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function BrandLogo({ size = 48 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={["#0ea5e9", "#14b8a6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name="plus" size={size * 0.55} color="#ffffff" />
      </LinearGradient>
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.title}>CrossCures</Text>
        <Text style={styles.subtitle}>AI Health Companion</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0f172a" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b" },
});
