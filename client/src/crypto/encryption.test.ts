import { describe, it, expect, beforeAll } from "vitest";
import { generateUserKeyPair } from "./keymanagement";
import { encryptMessage } from "./encryption";
import { decryptMessage } from "./decryption";

describe("Encryption and Decryption", () => {
  let keyPair: CryptoKeyPair;

  beforeAll(async () => {
    keyPair = await generateUserKeyPair();
  });

  // t1
  it("encryptMessage returns an object with three Base64 fields", async () => {
    const result = await encryptMessage("hello world", keyPair.publicKey);
    expect(typeof result.encryptedPayload).toBe("string");
    expect(result.encryptedPayload.length).toBeGreaterThan(0);
    expect(typeof result.encryptedKey).toBe("string");
    expect(result.encryptedKey.length).toBeGreaterThan(0);
    expect(typeof result.iv).toBe("string");
    expect(result.iv.length).toBe(16); 
  });

  // t2
  it("encryptMessage / decryptMessage round-trip", async () => {
    const message = "hello world";
    const result = await encryptMessage(message, keyPair.publicKey);
    const decryptedText = await decryptMessage(result, keyPair.privateKey);
    expect(decryptedText).toBe(message);
  });

  // t3
  it("each encryption produces a different iv and ciphertext", async () => {
    const message = "same message";
    const result1 = await encryptMessage(message, keyPair.publicKey);
    const result2 = await encryptMessage(message, keyPair.publicKey);
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.encryptedPayload).not.toBe(result2.encryptedPayload);
  });

  // t4
  it("decryptMessage throws when ciphertext is tampered", async () => {
    const message = "hello world";
    const result = await encryptMessage(message, keyPair.publicKey);
    const chars = result.encryptedPayload.split("");
    chars[5] = chars[5] === "A" ? "B" : "A";
    const tamperedPayloadString = chars.join("");
    const tamperedResult = {
      encryptedPayload: tamperedPayloadString,
      encryptedKey: result.encryptedKey,
      iv: result.iv,
    };
    await expect(
      decryptMessage(tamperedResult, keyPair.privateKey),
    ).rejects.toThrow();
  });
});
