// App.tsx — Root entry point
// Simple manual navigation (no router needed for a 2-screen app)

import React, { useState } from "react";
import { StatusBar, SafeAreaView, StyleSheet } from "react-native";
import HomeScreen from "./src/screens/HomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

type Screen = "home" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      {screen === "home" ? (
        <HomeScreen onOpenSettings={() => setScreen("settings")} />
      ) : (
        <SettingsScreen onBack={() => setScreen("home")} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0a" },
});
