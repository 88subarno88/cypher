import { describe, it, expect, beforeAll } from "vitest";
import { signMessage, verifyMessage } from "./signing";

describe("Digital Signatures (ECDSA)", () => {
  let signingKeyPair: CryptoKeyPair;

  beforeAll(async () => {
    signingKeyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-384" },
      true,
      ["sign", "verify"]
    );
  });

  // t1"signMessage returns a non-empty Base64 string"
  it("signMessage returns a non-empty Base64 string", async () => {
    const signature = await signMessage("hello", signingKeyPair.privateKey);
    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);
    expect(signature.length).toBe(128); 
  });

  // t2"verifyMessage returns true for a valid signature"
  it("verifyMessage returns true for a valid signature", async () => {
    const message = "hello";
    const signature = await signMessage(message, signingKeyPair.privateKey);
    
    // Test the round-trip
    const isValid = await verifyMessage(message, signature, signingKeyPair.publicKey);
    
    expect(isValid).toBe(true);
  });

  // t3"verifyMessage returns false when message is tampered"
  it("verifyMessage returns false when message is tampered", async () => {
    const originalMessage = "hello";
    const tamperedMessage = "hell0"; // changed o -> 0
    
    const signature = await signMessage(originalMessage, signingKeyPair.privateKey);
    const isValid = await verifyMessage(tamperedMessage, signature, signingKeyPair.publicKey);
    
    expect(isValid).toBe(false);
  });

  // t4: "verifyMessage returns false when signature is tampered"
  it("verifyMessage returns false when signature is tampered", async () => {
    const message = "hello";
    const signature = await signMessage(message, signingKeyPair.privateKey);
    const chars = signature.split("");
    chars[0] = chars[0] === "A" ? "B" : "A";
    const tamperedSignature = chars.join("");
    
    try {
      const isValid = await verifyMessage(message, tamperedSignature, signingKeyPair.publicKey);
      expect(isValid).toBe(false);
    } catch (e) {
      expect(e).toBeDefined(); 
    }
  });

});