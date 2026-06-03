// src/lib/sender.ts
// Sends the signed auth packet to your Windows PC over LAN.
// Uses plain HTTP POST — works with Expo Go, no ejecting needed.

import { buildAuthPacket } from "./hmac";

export type SendResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Fire the unlock signal to the Windows service.
 * @param pcIp   - e.g. "192.168.1.5"
 * @param port   - must match what the Windows service listens on (default 7779)
 * @param secret - pre-shared secret configured in both app and Windows service
 */
export async function sendUnlockSignal(
  pcIp: string,
  port: number,
  secret: string
): Promise<SendResult> {
  try {
    const packet = await buildAuthPacket(secret);
    console.log("[PhoneGate] auth packet", {
      timestamp: packet.timestamp,
      nonce: packet.nonce,
      hmac: packet.hmac,
      hmacLength: packet.hmac.length,
    });

    const controller = new AbortController();
    // Aggressive timeout — if PC isn't reachable, fail fast
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://${pcIp}:${port}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packet),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Server rejected: ${res.status} — ${body}` };
    }

    return { success: true };
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { success: false, error: "Timed out — is the PC on the same WiFi?" };
    }
    return { success: false, error: e?.message ?? "Unknown error" };
  }
}
