// src/lib/hmac.ts
// Generates a signed auth packet using HMAC-SHA256
// The Windows service validates this before acting on it.
// This prevents anyone else on your LAN from spoofing an unlock.

import HmacSHA256 from "crypto-js/hmac-sha256";
import Hex from "crypto-js/enc-hex";
import Utf8 from "crypto-js/enc-utf8";

export interface AuthPacket {
  timestamp: number; // Unix ms — server rejects if >10s old (replay protection)
  nonce: string;     // Random hex — server tracks to prevent exact replay
  hmac: string;      // HMAC-SHA256(secret, timestamp+nonce)
}

function isHex(secret: string): boolean {
  if (secret.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(secret);
}

async function hmacSHA256(secret: string, message: string): Promise<string> {
  const key = isHex(secret) ? Hex.parse(secret) : Utf8.parse(secret);
  return HmacSHA256(message, key).toString(Hex);
}

/** Generates a random hex nonce */
function randomNonce(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a signed AuthPacket ready to send to the Windows service */
export async function buildAuthPacket(secret: string): Promise<AuthPacket> {
  const timestamp = Date.now();
  const nonce = randomNonce();
  const message = `${timestamp}:${nonce}`;
  const hmac = await hmacSHA256(secret, message);

  return { timestamp, nonce, hmac };
}
