import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { useColors } from "@/hooks/useColors";
import { patientApi } from "@/lib/api";

export default function RecordsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const recordsQ = useQuery({
    queryKey: ["records"],
    queryFn: () => patientApi.getRecords(),
  });
  const records: any[] = Array.isArray(recordsQ.data) ? recordsQ.data : (recordsQ.data as any)?.records ?? [];

  const upload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);

      const fd = new FormData();
      const fileObj: any = {
        uri: asset.uri,
        name: asset.fileName ?? `record-${Date.now()}`,
        type: asset.mimeType ?? "application/octet-stream",
      };
      fd.append("file", fileObj);
      await patientApi.uploadRecords(fd);
      qc.invalidateQueries({ queryKey: ["records"] });
      Alert.alert("Uploaded", "Your record has been added.");
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Button
          title={uploading ? "Uploading…" : "Upload a record"}
          onPress={upload}
          loading={uploading}
          icon={<Feather name="upload" size={16} color="#fff" />}
        />
      </View>
      {recordsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : records.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No records yet"
          subtitle="Upload your medical records to share them with your physician."
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r: any, i: number) => String(r.id ?? i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }} padding={14}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: colors.brand100,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="file-text" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                    {item.title ?? item.resource_type ?? item.name ?? "Record"}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                    {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : ""}
                  </Text>
                </View>
                {item.resource_type ? <Pill label={item.resource_type} tone="info" /> : null}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
