import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

interface Msg {
  id: string;
  role: "patient" | "assistant";
  content: string;
}

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      const res: any = await patientApi.startHealthReportSession();
      setSessionId(res.session_id ?? res.id);
      const greeting = res.greeting ?? "Describe the symptom you'd like to report.";
      setMessages([{ id: "g0", role: "assistant", content: greeting }]);
    } catch (err: any) {
      Alert.alert("Couldn't start", err?.message ?? "");
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
      const res: any = await patientApi.sendHealthReportTurn(sessionId, text);
      const reply = res.reply ?? res.message ?? "Thanks for sharing.";
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
      await patientApi.endHealthReportSession(sessionId);
      Alert.alert("Report saved", "Your physician will see this in their next brief.");
    } catch {}
    setSessionId(null);
    setMessages([]);
  };

  if (!sessionId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#fef3c7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="alert-circle" size={42} color="#b45309" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Report a symptom</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Describe what you're experiencing and our AI will structure it for your care team.
        </Text>
        <View style={{ marginTop: 24, alignSelf: "stretch" }}>
          <Button title="Start a report" onPress={start} loading={starting} />
        </View>
      </View>
    );
  }

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
                lineHeight: 21,
              }}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={sending ? <ActivityIndicator style={{ margin: 12 }} /> : null}
      />
      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Describe what you're feeling…"
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
        <Button title="Finish report" variant="secondary" onPress={end} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 16 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
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
