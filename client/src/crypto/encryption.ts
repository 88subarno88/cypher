import {
  AES_ALGORITHM,
  AES_KEY_LENGTH,
  GCM_IV_LENGTH,
} from "../utils/constants";
import { toBase64, stringToBuffer } from "../utils/arraybuffer";

export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
): Promise<{ encryptedPayload: string; encryptedKey: string; iv: string }> {
  // generate a fresh AES-256-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );

  // generate a random 12-byte IV
  const ivBuffer = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));

  // encrypt the plaintext with the AES key
  const encryptedPayloadBuffer = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: ivBuffer },
    aesKey,
    stringToBuffer(plaintext),
  );

  const encryptedPayload = toBase64(encryptedPayloadBuffer);

  // wrap the AES key with the recipient's RSA public key
  const rawAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);

  // encrypt  raw bytes using the RSA public key
  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKeyBuffer,
  );

  const encryptedKey = toBase64(encryptedKeyBuffer);

  return {
    encryptedPayload: encryptedPayload,
    encryptedKey: encryptedKey,
    iv: toBase64(ivBuffer.buffer),
  };
}
