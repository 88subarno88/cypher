// Encrypts/decrypts raw file bytes using the same hybrid scheme
// as text messages: a random AES-256-GCM key encrypts the file,
// and that AES key is wrapped with the recipient's RSA-OAEP public key.
// The server only ever stores the encrypted bytes.

import { toBase64, fromBase64 } from "../utils/arraybuffer";

export interface EncryptedFileResult {
  encryptedData: ArrayBuffer; // the encrypted file bytes 
  encryptedKey: string;       // Base64 RSA-encrypted AES key
  iv: string;                 // Base64 AES-GCM iv
}


export async function encryptFile(
  fileBytes: ArrayBuffer,
  recipientPublicKey: CryptoKey,
): Promise<EncryptedFileResult> {
  // Generate a fresh AES-256-GCM key for this file
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  //Encrypt the file bytes with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBytes,
  );

  //Wrap the AES key with the recipient's RSA public key
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedKeyBuf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey,
  );

  return {
    encryptedData,
    encryptedKey: toBase64(encryptedKeyBuf),
    iv: toBase64(iv),
  };
}


export async function decryptFile(
  encryptedData: ArrayBuffer,
  encryptedKeyB64: string,
  ivB64: string,
  privateKey: CryptoKey,
): Promise<ArrayBuffer> {
  // Unwrap the AES key with our RSA private key
  const encryptedKeyBuf = fromBase64(encryptedKeyB64);
  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuf,
  );

  // Import the raw AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Decrypt the file bytes
  const iv = new Uint8Array(fromBase64(ivB64));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedData,
  );

  return decrypted;
}