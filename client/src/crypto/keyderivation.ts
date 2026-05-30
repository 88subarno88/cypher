import {
  PBKDF2_ITERATIONS,
  PBKDF2_HASH,
  SALT_LENGTH,
  AES_KEY_LENGTH,
} from "../utils/constants";
import { toBase64, fromBase64, stringToBuffer } from "../utils/arraybuffer";

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH)) as Uint8Array;
}

export async function deriveKeyFromPassword(
  password: string,
  salts: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    stringToBuffer(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salts as Uint8Array, //Vite and Vitest (which run via Node.js ) to test code that is meant for the Browser (Web Crypto),both lib: ["DOM"] for browsers and @types/node loaded => typeconflict
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}
