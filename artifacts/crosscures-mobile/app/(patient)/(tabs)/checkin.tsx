import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

interface Question {
  id: string;
  prompt: string;
  type: "scale" | "boolean" | "multiple_choice" | "text";
  options?: string[];
  scale_min?: number;
  scale_max?: number;
}

export default function CheckinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["checkin-today"],
    queryFn: () => patientApi.getTodayCheckin(),
  });

  const [responses, setResponses] = useState<Record<string, any>>({});

  const data: any = q.data;
  const completed: boolean = data?.completed ?? false;
  const questions: Question[] = data?.questions ?? data?.session?.questions ?? [];

  const submit = useMutation({
    mutationFn: () =>
      patientApi.submitCheckin({
        responses: questions.map((qu) => ({
          question_id: qu.id,
          value: responses[qu.id] ?? null,
          answered_at: new Date().toISOString(),
          skipped: responses[qu.id] === undefined,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin-today"] });
      Alert.alert("Submitted", "Your check-in has been recorded.");
    },
    onError: (err: any) => {
      Alert.alert("Submission failed", err?.message ?? "Please try again.");
    },
  });

  const answeredCount = useMemo(
    () => questions.filter((qu) => responses[qu.id] !== undefined).length,
    [questions, responses]
  );

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (q.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (q.error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="wifi-off"
          title="Couldn't load check-in"
          subtitle={(q.error as any)?.message ?? "Please try again."}
        />
        <Button title="Retry" onPress={() => q.refetch()} fullWidth={false} />
      </View>
    );
  }

  if (completed) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }]}>
        <ScreenHeader title="Check-in" subtitle="Today" />
        <View style={{ alignItems: "center", justifyContent: "center", padding: 32, flex: 1 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#dcfce7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="check" size={36} color="#15803d" />
          </View>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 20 }}>
            All done for today
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: colors.mutedForeground,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Come back tomorrow for your next check-in.
          </Text>
        </View>
      </View>
    );
  }

  if (!questions.length) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }]}>
        <ScreenHeader title="Check-in" />
        <EmptyState
          icon="calendar"
          title="No check-in available"
          subtitle="Your physician hasn't scheduled one for today."
        />
      </View>
    );
  }

  const progress = questions.length ? answeredCount / questions.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <ScreenHeader title="Daily check-in" subtitle={`${answeredCount}/${questions.length} answered`} />
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {questions.map((qu, i) => (
          <Card key={qu.id} style={{ marginBottom: 12 }} padding={16}>
            <Text style={[styles.qNum, { color: colors.mutedForeground }]}>
              Question {i + 1} of {questions.length}
            </Text>
            <Text style={[styles.qText, { color: colors.foreground }]}>{qu.prompt}</Text>
            <View style={{ marginTop: 12 }}>
              {qu.type === "scale" && (
                <ScaleAnswer
                  min={qu.scale_min ?? 1}
                  max={qu.scale_max ?? 10}
                  value={responses[qu.id]}
                  onChange={(v) => setResponses((r) => ({ ...r, [qu.id]: v }))}
                />
              )}
              {qu.type === "boolean" && (
                <ChoiceAnswer
                  options={["Yes", "No"]}
                  value={responses[qu.id]}
                  onChange={(v) => setResponses((r) => ({ ...r, [qu.id]: v }))}
                />
              )}
              {qu.type === "multiple_choice" && qu.options && (
                <ChoiceAnswer
                  options={qu.options}
                  value={responses[qu.id]}
                  onChange={(v) => setResponses((r) => ({ ...r, [qu.id]: v }))}
                />
              )}
              {qu.type === "text" && (
                <TextInput
                  placeholder="Type your answer…"
                  placeholderTextColor={colors.mutedForeground}
                  value={responses[qu.id] ?? ""}
                  onChangeText={(t) => setResponses((r) => ({ ...r, [qu.id]: t }))}
                  multiline
                  style={{
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    backgroundColor: colors.background,
                  }}
                />
              )}
            </View>
          </Card>
        ))}
        <View style={{ marginTop: 8 }}>
          <Button
            title="Submit check-in"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={answeredCount === 0}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ScaleAnswer({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: any;
  onChange: (v: number) => void;
}) {
  const colors = useColors();
  const items = [];
  for (let i = min; i <= max; i++) items.push(i);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: active ? "#ffffff" : colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceAnswer({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: any;
  onChange: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.brand50 : colors.background,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: active ? colors.primary : colors.foreground,
                fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                fontSize: 14,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  qNum: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qText: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 6 },
});
