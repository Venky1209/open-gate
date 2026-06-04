// src/lib/sender.ts
// Sends the signed auth packet to your Windows PC over LAN.
// Uses plain HTTP POST - works with Expo Go, no ejecting needed.

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
    const url = `http://${pcIp}:${port}/unlock`;

    console.log("[OpenGate] unlock request", {
      url,
      timestamp: packet.timestamp,
      nonce: packet.nonce,
      hmac: packet.hmac,
      hmacLength: packet.hmac.length,
    });

    const controller = new AbortController();
    // Aggressive timeout - if PC isn't reachable, fail fast
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(packet),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log("[OpenGate] unlock response", {
      url,
      status: res.status,
      ok: res.ok,
    });

    if (!res.ok) {
      const body = await res.text();
      console.log("[OpenGate] unlock response body", body);
      return { success: false, error: `Server rejected: ${res.status} - ${body}` };
    }

    return { success: true };
  } catch (e: any) {
    const message = String(e?.message ?? "");
    console.log("[OpenGate] unlock error", {
      name: e?.name,
      message,
      stack: e?.stack,
    });

    if (e?.name === "AbortError") {
      return { success: false, error: "Timed out - is the PC on the same WiFi?" };
    }

    if (/cleartext|CLEARTEXT|not permitted/i.test(message)) {
      return {
        success: false,
        error:
          "Android blocked the HTTP request. The APK needs cleartext LAN access for this URL.",
      };
    }

    if (/network request failed|failed to fetch|network error/i.test(message)) {
      return {
        success: false,
        error:
          "Network request failed. Check the PC IP, port, Wi-Fi, and whether the Windows service is listening on the LAN address.",
      };
    }

    if (/connection refused|ECONNREFUSED/i.test(message)) {
      return {
        success: false,
        error:
          "Connection refused. The PC is reachable, but nothing is listening on that port.",
      };
    }

    return { success: false, error: message || "Unknown error" };
  }
}
