// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import * as Crypto from "expo-crypto";
import { useSettings, Settings } from "../lib/useSettings";

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { settings, save } = useSettings();
  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!form.pcIp) {
      Alert.alert("Missing PC IP", "Enter your PC's local IP address.");
      return;
    }
    if (!form.secret || form.secret.length < 16) {
      Alert.alert("Weak secret", "Use at least 16 characters for the shared secret.");
      return;
    }
    await save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** Generate a cryptographically random secret and fill the field */
  const generateSecret = async () => {
    const bytes = await Crypto.getRandomBytesAsync(24);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setForm((f) => ({ ...f, secret: hex }));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PC CONNECTION</Text>

        <Text style={styles.label}>PC Local IP Address</Text>
        <TextInput
          style={styles.input}
          value={form.pcIp}
          onChangeText={(v) => setForm((f) => ({ ...f, pcIp: v.trim() }))}
          placeholder="e.g. 192.168.1.5"
          placeholderTextColor="#444"
          keyboardType="numeric"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          On your PC: run <Text style={styles.mono}>ipconfig</Text> → look for IPv4 Address under WiFi adapter.
        </Text>

        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          value={form.port}
          onChangeText={(v) => setForm((f) => ({ ...f, port: v.trim() }))}
          placeholder="7779"
          placeholderTextColor="#444"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>Must match the port set in the Windows service (default: 7779).</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>

        <Text style={styles.label}>Shared Secret</Text>
        <TextInput
          style={[styles.input, styles.inputMono]}
          value={form.secret}
          onChangeText={(v) => setForm((f) => ({ ...f, secret: v }))}
          placeholder="Paste the same secret from your PC config"
          placeholderTextColor="#444"
          autoCorrect={false}
          autoCapitalize="none"
          secureTextEntry={false}
          multiline
        />
        <TouchableOpacity style={styles.generateBtn} onPress={generateSecret}>
          <Text style={styles.generateBtnText}>⟳ Generate random secret</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Copy this exact string into <Text style={styles.mono}>appsettings.json</Text> on your Windows service.{"\n"}
          This is what prevents anyone else on your network from unlocking your PC.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HOW TO FIND YOUR PC IP</Text>
        <Text style={styles.steps}>
          1. Press Win + R → type <Text style={styles.mono}>cmd</Text> → Enter{"\n"}
          2. Type <Text style={styles.mono}>ipconfig</Text> → Enter{"\n"}
          3. Look for <Text style={styles.mono}>Wireless LAN adapter Wi-Fi</Text>{"\n"}
          4. Copy the <Text style={styles.mono}>IPv4 Address</Text> (e.g. 192.168.1.x){"\n\n"}
          Make sure your phone and PC are on the same WiFi network.
        </Text>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{saved ? "✓ Saved" : "Save Settings"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { padding: 24, paddingBottom: 60 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  backBtn: { padding: 4 },
  backText: { color: "#3b82f6", fontSize: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  section: { marginBottom: 32 },
  sectionTitle: { color: "#555", fontSize: 11, letterSpacing: 1.5, marginBottom: 16, fontWeight: "600" },
  label: { color: "#ccc", fontSize: 14, marginBottom: 8, fontWeight: "500" },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#fff",
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  inputMono: { fontFamily: "monospace", fontSize: 13 },
  hint: { color: "#555", fontSize: 12, lineHeight: 18, marginBottom: 4 },
  mono: { color: "#888", fontFamily: "monospace" },
  generateBtn: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
  },
  generateBtnText: { color: "#60a5fa", fontSize: 13 },
  steps: { color: "#666", fontSize: 13, lineHeight: 22 },
  saveBtn: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDone: { backgroundColor: "#15803d" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
