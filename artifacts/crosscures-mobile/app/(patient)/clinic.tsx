import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
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
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

interface Msg {
  id: string;
  role: "patient" | "assistant";
  content: string;
}

export default function ClinicScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  const start = async () => {
    setStarting(true);
    try {
      const res: any = await patientApi.startClinicSession({ audio_enabled: false });
      const id = res.session_id ?? res.id;
      setSessionId(id);
      const greeting = res.greeting ?? res.message ?? "Hi, I'm Maria. How are you feeling today?";
      setMessages([{ id: "g0", role: "assistant", content: greeting }]);
    } catch (err: any) {
      Alert.alert("Couldn't start session", err?.message ?? "Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    setInput("");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "patient", content: text };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const res: any = await patientApi.sendClinicTurn(sessionId, text);
      const reply = res.reply ?? res.message ?? res.content ?? "(no response)";
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: "assistant", content: `Sorry, an error occurred: ${err?.message ?? "unknown"}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const end = async () => {
    if (!sessionId) return;
    setEnding(true);
    try {
      await patientApi.endClinicSession(sessionId);
      Alert.alert("Session ended", "Your conversation has been saved.");
      setSessionId(null);
      setMessages([]);
    } catch (err: any) {
      Alert.alert("Couldn't end session", err?.message ?? "Please try again.");
    } finally {
      setEnding(false);
    }
  };

  if (!sessionId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.brand100,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="mic" size={42} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Talk with Maria</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Maria is your AI clinic companion. Share how you're feeling and she'll help structure your notes for your physician.
        </Text>
        <View style={{ marginTop: 24, alignSelf: "stretch" }}>
          <Button title="Start session" onPress={start} loading={starting} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState icon="message-circle" title="No messages yet" subtitle="Say hello to Maria." />
        }
        renderItem={({ item }) => <Bubble msg={item} />}
        ListFooterComponent={
          sending ? (
            <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
              <ActivityIndicator size="small" />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                Maria is typing…
              </Text>
            </View>
          ) : null
        }
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
          placeholder="Type a message to Maria"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.composerInput,
            { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
          ]}
          multiline
          onSubmitEditing={send}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: input.trim() && !sending ? colors.primary : colors.muted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="send" size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 4 }}>
        <Button title="End session" variant="secondary" onPress={end} loading={ending} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const colors = useColors();
  const isUser = msg.role === "patient";
  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        backgroundColor: isUser ? colors.primary : colors.card,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        borderTopRightRadius: isUser ? 4 : 18,
        borderTopLeftRadius: isUser ? 18 : 4,
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: isUser ? "#fff" : colors.foreground,
          fontFamily: "Inter_400Regular",
          fontSize: 15,
          lineHeight: 21,
        }}
      >
        {msg.content}
      </Text>
    </View>
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
  composer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
    alignItems: "flex-end",
  },
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
