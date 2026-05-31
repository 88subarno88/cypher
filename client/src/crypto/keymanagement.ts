import { RSA_ALGORITHM } from "../utils/constants";
import { toBase64, fromBase64 } from "../utils/arraybuffer";

export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return toBase64(await crypto.subtle.exportKey("spki", key));
}


export async function exportPrivateKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("pkcs8", key);
}

export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromBase64(spkiBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );
}

export async function importPrivateKey(
  pkcs8Buffer: ArrayBuffer,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );
}

