import { describe, it, expect } from "vitest";
import {
  generateUserKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
} from "./keymanagement";

describe("keyManagement", () => {
  // t1:"generateUserKeyPair returns a CryptoKeyPair"
  it("generateUserKeyPair returns a CryptoKeyPair", async () => {
    const pair = await generateUserKeyPair();

    expect(pair.publicKey).toBeDefined();
    expect(pair.privateKey).toBeDefined();
    expect(pair.publicKey.type).toBe("public");
    expect(pair.privateKey.type).toBe("private");
    expect(pair.publicKey.algorithm.name).toBe("RSA-OAEP");
  });

  // t2"exportPublicKey returns a Base64 SPKI string"
  it("exportPublicKey returns a Base64 SPKI string", async () => {
    const pair = await generateUserKeyPair();
    const spkiBase64 = await exportPublicKey(pair.publicKey);

    expect(typeof spkiBase64).toBe("string");
    expect(spkiBase64.length).toBeGreaterThan(100);
    expect(spkiBase64.startsWith("MIIC") || spkiBase64.startsWith("MIIF")).toBe(
      true,
    );
  });

  // t3:"importPublicKey round-trip: export → import → same Base64"
  it("importPublicKey round-trip: export → import → same Base64", async () => {
    const pair = await generateUserKeyPair();
    const originalBase64 = await exportPublicKey(pair.publicKey);
    const importedKey = await importPublicKey(originalBase64);
    expect(importedKey.type).toBe("public");
    const reExportedBase64 = await exportPublicKey(importedKey);
    expect(reExportedBase64).toBe(originalBase64);
  });

  // t4:"importPrivateKey round-trip: export → import → CryptoKey"
  it("importPrivateKey round-trip: export → import → CryptoKey", async () => {
    const pair = await generateUserKeyPair();
    const rawBuffer = await exportPrivateKey(pair.privateKey);
    const importedKey = await importPrivateKey(rawBuffer);
    expect(importedKey.type).toBe("private");
    expect(importedKey.algorithm.name).toBe("RSA-OAEP");
  });

  // t5:"keys work for encrypt then decrypt"
  it("keys work for encrypt then decrypt", async () => {
    const pair = await generateUserKeyPair();
    const testMessage = "cipher-test";
    const encodedData = new TextEncoder().encode(testMessage);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pair.publicKey,
      encodedData,
    );
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      pair.privateKey,
      ciphertext,
    );
    const decodedMessage = new TextDecoder().decode(decryptedBuffer);
    expect(decodedMessage).toBe(testMessage);
  });
});
