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
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { sendUnlockSignal } from "../lib/sender";
import { useSettings } from "../lib/useSettings";

type State = "idle" | "scanning" | "sending" | "success" | "error";

export default function HomeScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { settings, loaded } = useSettings();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [biometryType, setBiometryType] = useState<string>("Biometric");

  // Pulse animation for the fingerprint button
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
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleUnlock = useCallback(async () => {
    // Guard: settings must be configured
    if (!settings.pcIp || !settings.secret) {
      setErrorMsg("Set your PC IP and secret in Settings first.");
      setState("error");
      return;
    }

    setState("scanning");
    startPulse();

    try {
      // Check hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        throw new Error("No biometric enrolled on this device.");
      }

      // Trigger biometric prompt
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to unlock PC",
        cancelLabel: "Cancel",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });

      if (!result.success) {
        throw new Error(
          result.error === "user_cancel"
            ? "Cancelled."
            : `Auth failed: ${result.error}`
        );
      }

      // Biometric passed — send signal to PC
      stopPulse();
      setState("sending");

      const sendResult = await sendUnlockSignal(
        settings.pcIp,
        parseInt(settings.port, 10),
        settings.secret
      );

      if (!sendResult.success) {
        throw new Error(sendResult.error);
      }

      setState("success");
      // Auto-reset after 2s
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PhoneGate</Text>
        <Text style={styles.subtitle}>Windows unlock via biometrics</Text>
      </View>

      {/* PC IP indicator */}
      <View style={styles.targetBadge}>
        <View style={[styles.dot, settings.pcIp ? styles.dotActive : styles.dotInactive]} />
        <Text style={styles.targetText}>
          {settings.pcIp ? `${settings.pcIp}:${settings.port}` : "No PC configured"}
        </Text>
      </View>

      {/* Main button */}
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
                {state === "success" ? "✓" : state === "error" ? "✕" : "⏻"}
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
      </View>

      {/* Settings link */}
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
  buttonArea: { alignItems: "center", gap: 24 },
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
    maxWidth: 220,
    minHeight: 40,
  },
  settingsBtn: { padding: 12 },
  settingsBtnText: { color: "#555", fontSize: 14 },
});
