import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Pill } from "@/components/Pill";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

export default function MedicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const rxQ = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => patientApi.getPrescriptions(),
  });
  const items: any[] = Array.isArray(rxQ.data) ? rxQ.data : (rxQ.data as any)?.prescriptions ?? [];

  const confirm = useMutation({
    mutationFn: (id: string) => patientApi.confirmPrescription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescriptions"] }),
  });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <ScreenHeader
        title="Medications"
        subtitle="Your active therapy"
        right={
          <Pressable
            onPress={() => setModalOpen(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        }
      />

      {rxQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="package"
          title="No medications yet"
          subtitle="Add a prescription to track adherence."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it: any) => String(it.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }} padding={16}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: colors.brand100,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="package" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medName, { color: colors.foreground }]}>
                    {item.medication_name}
                  </Text>
                  <Text style={[styles.medDose, { color: colors.mutedForeground }]}>
                    {item.dose} · {item.frequency}
                  </Text>
                  {item.prescribing_physician ? (
                    <Text style={[styles.physician, { color: colors.mutedForeground }]}>
                      Prescribed by {item.prescribing_physician}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 8, flexDirection: "row", gap: 6 }}>
                    {item.confirmed ? (
                      <Pill label="Confirmed" tone="success" />
                    ) : (
                      <Pill label="Awaiting" tone="warning" />
                    )}
                  </View>
                  {!item.confirmed && (
                    <View style={{ marginTop: 10 }}>
                      <Button
                        title="Confirm"
                        variant="secondary"
                        fullWidth={false}
                        onPress={() => confirm.mutate(item.id)}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <AddMedModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          qc.invalidateQueries({ queryKey: ["prescriptions"] });
        }}
      />
    </View>
  );
}

function AddMedModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [freq, setFreq] = useState("");
  const [doc, setDoc] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !dose || !freq) {
      Alert.alert("Missing info", "Name, dose and frequency are required.");
      return;
    }
    setLoading(true);
    try {
      await patientApi.createPrescription({
        medication_name: name,
        dose,
        frequency: freq,
        prescribing_physician: doc || undefined,
        start_date: start,
      });
      setName(""); setDose(""); setFreq(""); setDoc("");
      onCreated();
    } catch (err: any) {
      Alert.alert("Failed", err?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add medication</Text>
        <Input label="Medication name" value={name} onChangeText={setName} />
        <Input label="Dose" value={dose} onChangeText={setDose} placeholder="10mg" />
        <Input label="Frequency" value={freq} onChangeText={setFreq} placeholder="Once daily" />
        <Input label="Prescribing physician (optional)" value={doc} onChangeText={setDoc} />
        <Input label="Start date" value={start} onChangeText={setStart} />
        <Button title="Save medication" onPress={submit} loading={loading} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  medName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medDose: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  physician: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0006" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
});
