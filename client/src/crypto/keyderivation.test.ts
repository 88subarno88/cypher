import { describe, it, expect } from "vitest";
import { generateSalt, deriveKeyFromPassword } from "./keyderivation";

describe("Key Derivation (PBKDF2)", () => {

  // t1: "generateSalt returns a 32-byte Uint8Array"
  it("generateSalt returns a 32-byte Uint8Array", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt(); 
    expect(salt1).toBeInstanceOf(Uint8Array);
    expect(salt1.length).toBe(32);
    expect(salt1).not.toEqual(salt2);
  });

  // t2: "deriveKeyFromPassword returns an AES-GCM CryptoKey"
  it("deriveKeyFromPassword returns an AES-GCM CryptoKey", async () => {
    const salt = generateSalt();
    const key = await deriveKeyFromPassword("password123", salt);
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  // t3:"same password + same salt always produces a usable key"
  it("same password + same salt always produces a usable key", async () => {
    const salt = generateSalt();
    const password = "password123";
    const key1 = await deriveKeyFromPassword(password, salt);
    const key2 = await deriveKeyFromPassword(password, salt);
    const testMessage = "test-data";
    const testBytes = new TextEncoder().encode(testMessage);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key1,
      testBytes
    );

    const decryptedBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key2,
      encryptedBytes
    );

    const decryptedMessage = new TextDecoder().decode(decryptedBytes);
    expect(decryptedMessage).toBe(testMessage);
  });

  // t4: "different password produces a key that cannot decrypt"
  it("different password produces a key that cannot decrypt", async () => {
    const salt = generateSalt();
    const correctKey = await deriveKeyFromPassword("correct-password", salt);
    const testBytes = new TextEncoder().encode("secret payload");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      correctKey,
      testBytes
    );
    const wrongKey = await deriveKeyFromPassword("wrong-password", salt);
    await expect(
      crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        wrongKey,
        encryptedBytes
      )
    ).rejects.toThrow();
  });

});