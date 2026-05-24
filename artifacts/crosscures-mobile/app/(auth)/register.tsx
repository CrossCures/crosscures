import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

type Role = "patient" | "physician";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("patient");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [npi, setNpi] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [consents, setConsents] = useState({ data: false, ai: false, share: false });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const canProceed1 = !!role;
  const canProceed2 = consents.data && consents.ai;
  const canSubmit =
    fullName && email && password.length >= 6 &&
    (role === "physician" ? !!npi : true);

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert("Missing info", "Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const user = await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        date_of_birth: dob || undefined,
        npi_number: role === "physician" ? npi : undefined,
        specialty: role === "physician" ? specialty || undefined : undefined,
      });
      router.replace(user.role === "physician" ? "/(physician)/(tabs)/dashboard" : "/(patient)/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Registration failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            { paddingTop: topPad + 16, paddingBottom: 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => (step === 1 ? router.back() : setStep(step - 1))}
            style={styles.backRow}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.backText, { color: colors.foreground }]}>
              {step === 1 ? "Back" : "Previous"}
            </Text>
          </Pressable>

          <View style={styles.progress}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  marginHorizontal: 3,
                  backgroundColor: n <= step ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
            Step {step} of 3
          </Text>

          {step === 1 && (
            <Card padding={20}>
              <Text style={[styles.h1, { color: colors.foreground }]}>I am a…</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                Choose your role to tailor the experience.
              </Text>
              <View style={{ gap: 12, marginTop: 20 }}>
                <RoleOption
                  selected={role === "patient"}
                  icon="user"
                  title="Patient"
                  subtitle="Track care, talk to Maria, share records"
                  onPress={() => setRole("patient")}
                />
                <RoleOption
                  selected={role === "physician"}
                  icon="briefcase"
                  title="Physician"
                  subtitle="See briefs, monitor therapy, review alerts"
                  onPress={() => setRole("physician")}
                />
              </View>
              <View style={{ marginTop: 24 }}>
                <Button
                  title="Continue"
                  onPress={() => setStep(2)}
                  disabled={!canProceed1}
                />
              </View>
            </Card>
          )}

          {step === 2 && (
            <Card padding={20}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                Consents
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                We need a few permissions to provide your care experience.
              </Text>
              <View style={{ gap: 10, marginTop: 16 }}>
                <ConsentRow
                  checked={consents.data}
                  onToggle={() => setConsents((c) => ({ ...c, data: !c.data }))}
                  title="Health data processing"
                  subtitle="Required to securely store and analyze your health information."
                />
                <ConsentRow
                  checked={consents.ai}
                  onToggle={() => setConsents((c) => ({ ...c, ai: !c.ai }))}
                  title="AI assistance"
                  subtitle="Required to generate insights, briefs, and Maria conversations."
                />
                <ConsentRow
                  checked={consents.share}
                  onToggle={() => setConsents((c) => ({ ...c, share: !c.share }))}
                  title="Share with care team (optional)"
                  subtitle="Allow physicians to access your timeline."
                />
              </View>
              <View style={{ marginTop: 24 }}>
                <Button
                  title="Continue"
                  onPress={() => setStep(3)}
                  disabled={!canProceed2}
                />
              </View>
            </Card>
          )}

          {step === 3 && (
            <Card padding={20}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                Your profile
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>
                The basics so we can set up your account.
              </Text>
              <View style={{ marginTop: 16 }}>
                <Input label="Full name" value={fullName} onChangeText={setFullName} />
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {role === "patient" ? (
                  <Input
                    label="Date of birth (YYYY-MM-DD)"
                    value={dob}
                    onChangeText={setDob}
                    placeholder="1990-05-12"
                  />
                ) : (
                  <>
                    <Input label="NPI number" value={npi} onChangeText={setNpi} />
                    <Input
                      label="Specialty"
                      value={specialty}
                      onChangeText={setSpecialty}
                      placeholder="e.g., Cardiology"
                    />
                  </>
                )}
              </View>
              <View style={{ marginTop: 12 }}>
                <Button
                  title="Create account"
                  onPress={submit}
                  loading={loading}
                  disabled={!canSubmit}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function RoleOption({
  selected,
  icon,
  title,
  subtitle,
  onPress,
}: {
  selected: boolean;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: colors.radius,
        borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.brand50 : colors.card,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: selected ? colors.primary : colors.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather
          name={icon}
          size={20}
          color={selected ? "#ffffff" : colors.mutedForeground}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      {selected && <Feather name="check-circle" size={20} color={colors.primary} />}
    </Pressable>
  );
}

function ConsentRow({
  checked,
  onToggle,
  title,
  subtitle,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 12,
        borderRadius: colors.radius - 4,
        backgroundColor: colors.muted,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          backgroundColor: checked ? colors.primary : colors.card,
          borderWidth: 1,
          borderColor: checked ? colors.primary : colors.border,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {checked && <Feather name="check" size={14} color="#ffffff" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  progress: { flexDirection: "row", marginTop: 8, marginBottom: 6 },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 16 },
  h1: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
});
