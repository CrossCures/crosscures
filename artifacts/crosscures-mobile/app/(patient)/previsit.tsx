import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

interface Msg {
  id: string;
  role: "patient" | "assistant";
  content: string;
}

export default function PrevisitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"schedule" | "session">("schedule");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  const slotsQ = useQuery({
    queryKey: ["previsit-slots"],
    queryFn: () => patientApi.getPrevisitSlots(),
  });
  const slots: any[] = Array.isArray(slotsQ.data) ? slotsQ.data : (slotsQ.data as any)?.slots ?? [];

  const schedule = async (slot: any) => {
    try {
      await patientApi.schedulePrevisit({ scheduled_at: slot.scheduled_at ?? slot.start });
      Alert.alert("Scheduled", "We'll remind you when it's time.");
    } catch (err: any) {
      Alert.alert("Couldn't schedule", err?.message ?? "Please try again.");
    }
  };

  const startNow = async () => {
    setStarting(true);
    try {
      const res: any = await patientApi.startPrevisitSession({});
      const id = res.session_id ?? res.id;
      setSessionId(id);
      setMode("session");
      const greeting = res.greeting ?? res.message ?? "Hi, let's prepare for your visit. What's the main reason for it?";
      setMessages([{ id: "g0", role: "assistant", content: greeting }]);
    } catch (err: any) {
      Alert.alert("Couldn't start", err?.message ?? "Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "patient", content: text }]);
    setSending(true);
    try {
      const res: any = await patientApi.sendPrevisitTurn(sessionId, text);
      const reply = res.reply ?? res.message ?? "(no response)";
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    } catch (err: any) {
      Alert.alert("Send failed", err?.message ?? "");
    } finally {
      setSending(false);
    }
  };

  const end = async () => {
    if (!sessionId) return;
    try {
      await patientApi.endPrevisitSession(sessionId);
    } catch {}
    setSessionId(null);
    setMessages([]);
    setMode("schedule");
  };

  if (mode === "session" && sessionId) {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.role === "patient" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                backgroundColor: item.role === "patient" ? colors.primary : colors.card,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 18,
                borderWidth: item.role === "patient" ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: item.role === "patient" ? "#fff" : colors.foreground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                }}
              >
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={sending ? <ActivityIndicator style={{ margin: 12 }} /> : null}
        />
        <View
          style={[
            styles.composer,
            { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Reply…"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.composerInput,
              { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
            ]}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() && !sending ? colors.primary : colors.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={{ padding: 12, paddingBottom: insets.bottom + 8 }}>
          <Button title="Finish pre-visit" variant="secondary" onPress={end} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Card style={{ marginBottom: 16 }} padding={20}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#dcfce7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="phone" size={24} color="#15803d" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Pre-visit call</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              A 5-minute AI conversation to brief your physician before your visit.
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <Button title="Start a call now" onPress={startNow} loading={starting} />
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.foreground }]}>Or schedule for later</Text>
      {slotsQ.isLoading ? (
        <ActivityIndicator />
      ) : slots.length === 0 ? (
        <Card padding={16}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            No slots available right now.
          </Text>
        </Card>
      ) : (
        slots.map((slot: any, i: number) => (
          <Pressable key={slot.id ?? i} onPress={() => schedule(slot)}>
            <Card style={{ marginBottom: 8 }} padding={14}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="clock" size={18} color={colors.primary} />
                <Text style={{ marginLeft: 10, color: colors.foreground, fontFamily: "Inter_500Medium" }}>
                  {formatSlot(slot.scheduled_at ?? slot.start)}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function formatSlot(s?: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 19 },
  section: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  composer: { flexDirection: "row", padding: 10, borderTopWidth: 1, gap: 8, alignItems: "flex-end" },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
});
