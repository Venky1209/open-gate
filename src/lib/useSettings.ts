// src/lib/useSettings.ts
// Persists config in Expo SecureStore (encrypted on-device storage).
// SecureStore is backed by Android Keystore — safe for the shared secret.

import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

export interface Settings {
  pcIp: string;
  port: string;
  secret: string;
}

const DEFAULTS: Settings = {
  pcIp: "",
  port: "7779",
  secret: "",
};

const KEY = "phonegate_settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) setSettings(JSON.parse(raw));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (next: Settings) => {
    setSettings(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }, []);

  return { settings, save, loaded };
}
