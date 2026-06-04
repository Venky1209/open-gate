// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { sendUnlockSignal } from "../lib/sender";
import { useSettings } from "../lib/useSettings";

type State = "idle" | "scanning" | "sending" | "success" | "error";

type DiagnosticItem = {
  label: string;
  value: string;
};

export default function HomeScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { settings, loaded } = useSettings();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [biometryType, setBiometryType] = useState<string>("Biometric");

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
      if (hasFace && hasFingerprint) setBiometryType("Face / Fingerprint");
      else if (hasFace) setBiometryType("Face ID");
      else if (hasFingerprint) setBiometryType("Fingerprint");
    })();
  }, []);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleUnlock = useCallback(async () => {
    setDiagnostics([]);

    if (!settings.pcIp || !settings.secret) {
      setErrorMsg("Set your PC IP and secret in Settings first.");
      setDiagnostics([
        { label: "PC IP", value: settings.pcIp || "missing" },
        { label: "Port", value: settings.port || "missing" },
        { label: "Secret", value: settings.secret ? "present" : "missing" },
      ]);
      setState("error");
      return;
    }

    setState("scanning");
    startPulse();

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        throw new Error("No biometric enrolled on this device.");
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to unlock PC",
        cancelLabel: "Cancel",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        throw new Error(
          result.error === "user_cancel" ? "Cancelled." : `Auth failed: ${result.error}`
        );
      }

      stopPulse();
      setState("sending");

      const sendResult = await sendUnlockSignal(
        settings.pcIp,
        parseInt(settings.port, 10),
        settings.secret
      );

      if (!sendResult.success) {
        setDiagnostics([
          { label: "Target", value: `${settings.pcIp}:${settings.port}` },
          { label: "Endpoint", value: `http://${settings.pcIp}:${settings.port}/unlock` },
          { label: "Secret length", value: `${settings.secret.length} chars` },
          {
            label: "Likely cause",
            value: sendResult.error.includes("cleartext")
              ? "Android blocked HTTP traffic"
              : sendResult.error.includes("refused")
                ? "Nothing is listening on that port"
                : sendResult.error.includes("Timed out")
                  ? "PC is not reachable on this Wi-Fi"
                  : "Network failed or service rejected the request",
          },
          { label: "Raw error", value: sendResult.error },
        ]);
        throw new Error(sendResult.error);
      }

      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch (e: any) {
      stopPulse();
      setErrorMsg(e?.message ?? "Something went wrong.");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [settings, startPulse, stopPulse]);

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OpenGate</Text>
        <Text style={styles.subtitle}>Windows unlock via biometrics</Text>
      </View>

      <View style={styles.targetBadge}>
        <View style={[styles.dot, settings.pcIp ? styles.dotActive : styles.dotInactive]} />
        <Text style={styles.targetText}>
          {settings.pcIp ? `${settings.pcIp}:${settings.port}` : "No PC configured"}
        </Text>
      </View>

      <View style={styles.buttonArea}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.unlockBtn,
              state === "success" && styles.unlockBtnSuccess,
              state === "error" && styles.unlockBtnError,
            ]}
            onPress={handleUnlock}
            disabled={state === "scanning" || state === "sending"}
            activeOpacity={0.85}
          >
            {state === "scanning" || state === "sending" ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.unlockIcon}>
                {state === "success" ? "✓" : state === "error" ? "✕" : "↻"}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.btnLabel}>
          {state === "idle" && `Tap to unlock with ${biometryType}`}
          {state === "scanning" && "Waiting for biometric..."}
          {state === "sending" && "Sending to PC..."}
          {state === "success" && "PC unlocked!"}
          {state === "error" && errorMsg}
        </Text>

        {state === "error" && diagnostics.length > 0 ? (
          <View style={styles.diagnosticsCard}>
            <Text style={styles.diagnosticsTitle}>Diagnostics</Text>
            <ScrollView style={styles.diagnosticsList} contentContainerStyle={styles.diagnosticsListContent}>
              {diagnostics.map((item) => (
                <View key={item.label} style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{item.label}</Text>
                  <Text style={styles.diagnosticValue}>{item.value}</Text>
                </View>
              ))}
              <View style={styles.diagnosticHint}>
                <Text style={styles.diagnosticHintText}>
                  Expo Go and the standalone APK do not share SecureStore data. If the APK fails but Expo Go works, compare the saved IP, port, and secret in the APK.
                </Text>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
        <Text style={styles.settingsBtnText}>⚙ Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: { alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: "700", color: "#ffffff", letterSpacing: 1 },
  subtitle: { fontSize: 14, color: "#666", letterSpacing: 0.5 },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: "#22c55e" },
  dotInactive: { backgroundColor: "#444" },
  targetText: { color: "#aaa", fontSize: 13, fontFamily: "monospace" },
  buttonArea: { alignItems: "center", gap: 24, width: "100%" },
  unlockBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  unlockBtnSuccess: { backgroundColor: "#15803d", shadowColor: "#22c55e" },
  unlockBtnError: { backgroundColor: "#991b1b", shadowColor: "#ef4444" },
  unlockIcon: { fontSize: 48, color: "#fff" },
  btnLabel: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
    minHeight: 40,
  },
  diagnosticsCard: {
    width: "100%",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    maxHeight: 260,
  },
  diagnosticsTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  diagnosticsList: { maxHeight: 200 },
  diagnosticsListContent: { gap: 10 },
  diagnosticRow: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  diagnosticLabel: {
    color: "#7c7c7c",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  diagnosticValue: {
    color: "#e5e5e5",
    fontSize: 13,
    lineHeight: 18,
  },
  diagnosticHint: {
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  diagnosticHintText: {
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 18,
  },
  settingsBtn: { padding: 12 },
  settingsBtnText: { color: "#555", fontSize: 14 },
});
