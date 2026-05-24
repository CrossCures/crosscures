import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      router.replace(user.role === "physician" ? "/(physician)/(tabs)/dashboard" : "/(patient)/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Sign in failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (role: "patient" | "physician") => {
    if (role === "patient") {
      setEmail("patient@demo.com");
      setPassword("demo1234");
    } else {
      setEmail("doctor@demo.com");
      setPassword("demo1234");
    }
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <LinearGradient
      colors={[colors.brand50, "#ecfeff", colors.brand100]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 24, paddingBottom: 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <BrandLogo size={56} />
          </View>

          <Card style={{ marginTop: 24 }} padding={20}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              Welcome back
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Sign in to continue your care journey
            </Text>

            <View style={{ marginTop: 20 }}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                testID="login-email"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                testID="login-password"
              />
              <View style={{ marginTop: 4 }}>
                <Button
                  title="Sign in"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>
            </View>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                Try a demo
              </Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <View style={{ gap: 8 }}>
              <Button
                title="Demo as patient"
                variant="secondary"
                onPress={() => demoLogin("patient")}
              />
              <Button
                title="Demo as physician"
                variant="secondary"
                onPress={() => demoLogin("physician")}
              />
            </View>
          </Card>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              New to CrossCures?{" "}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Create account
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  brand: { alignItems: "center", marginTop: 8 },
  heading: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  line: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
