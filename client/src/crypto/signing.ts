// ── WHAT IS THIS FILE? ────────────────────────────────────
// Digital signatures for message authenticity.
// Two exported functions: signMessage() and verifyMessage()
//
// ── THE CONCEPT BEFORE YOU WRITE ──────────────────────────
// Encryption answers: "Can only the recipient READ this?"
// Signing answers:    "Did this REALLY come from the claimed sender?"
//
// They solve different problems. Cipher uses BOTH:
//   → Encryption (encryption.ts) keeps messages private
//   → Signing (this file) proves who sent each message
//
// How signing works:
//   Sender side:
//     → Takes the message bytes
//     → Runs them through ECDSA with their PRIVATE key
//     → Gets back a signature (a blob of bytes unique to this message
//       AND this private key)
//     → Sends: message + signature
//
//   Recipient side:
//     → Takes the message bytes + the signature
//     → Runs them through ECDSA with the sender's PUBLIC key
//     → Gets back: true (signature valid) or false (tampered / wrong sender)
//
// WHY ECDSA P-384?
//   → Elliptic Curve Digital Signature Algorithm on the P-384 curve
//   → Stronger than P-256, still fast
//   → The P-384 curve is used by NSA Suite B for classified data
//   → Produces smaller signatures than RSA for the same security level
//
// ── RESOURCES TO READ BEFORE WRITING ─────────────────────
// 1. MDN SubtleCrypto.sign():
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign
//    Find the ECDSA example — study the algorithm parameter object shape.
//
// 2. MDN SubtleCrypto.verify():
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
//    The mirror of sign(). Returns a Promise<boolean>.
//
// 3. MDN SubtleCrypto.generateKey() — ECDSA key generation:
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
//    Find the ECDSA section. The key pair has different usages than RSA-OAEP:
//    publicKey gets "verify", privateKey gets "sign".
//
// 4. WebCrypto examples — ECDSA section:
//      https://github.com/diafygi/webcrypto-examples#ecdsa---sign
//
// ── IMPORTS YOU WILL NEED ─────────────────────────────────
// From "@/utils/arrayBuffer":
//   toBase64, fromBase64, stringToBuffer
//

import { toBase64, fromBase64, stringToBuffer } from "../utils/arraybuffer";
// ── NOTE ON KEY GENERATION ────────────────────────────────
// The ECDSA signing key pair is separate from the RSA-OAEP key pair.
// You generate the signing key pair in a similar way to keyManagement.ts
// but with ECDSA_ALGORITHM and usages ["sign", "verify"].
// For now, the sign/verify functions receive the key as a parameter —
// key generation for ECDSA will be wired into the registration flow
// on Day 4/5. For Day 2 just focus on the sign and verify operations.
//
// ── FUNCTION 1: signMessage ───────────────────────────────
//
// Signature:
//   export async function signMessage(
//     message: string,
//     privateKey: CryptoKey
//   ): Promise<string>
//
// Returns: a Base64 string (the signature)
//
// HOW TO WRITE IT:
//
//   STEP 1 — Convert the message string to bytes
//     → Use stringToBuffer(message) from arrayBuffer.ts
//     → crypto.subtle.sign() needs an ArrayBuffer, not a string
//
//   STEP 2 — Sign the bytes
//     → Call crypto.subtle.sign() with THREE arguments:
//         Arg 1: algorithm object
//           { name: "ECDSA", hash: "SHA-384" }
//           → "ECDSA" matches the key algorithm
//           → "SHA-384" is the hash used internally by ECDSA P-384
//           → The hash name MUST match the curve number (P-384 → SHA-384)
//           → Using SHA-256 with P-384 will still work but is
//             non-standard — use SHA-384 to be correct
//         Arg 2: privateKey  (the CryptoKey passed in)
//         Arg 3: the ArrayBuffer from Step 1
//     → Returns a Promise<ArrayBuffer> — the raw signature bytes
//
//   STEP 3 — Convert signature to Base64 and return
//     → toBase64(signatureBuffer)
//

export async function signMessage(
  message: string,
  privateKey: CryptoKey,
): Promise<string> {
  const arrybuf = stringToBuffer(message);
  return toBase64(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-384" }, privateKey, arrybuf),
  );
}
// ── FUNCTION 2: verifyMessage ─────────────────────────────
//
// Signature:
//   export async function verifyMessage(
//     message: string,
//     signatureBase64: string,
//     publicKey: CryptoKey
//   ): Promise<boolean>
//
// Returns: true if signature is valid, false if tampered or wrong key
//
// HOW TO WRITE IT:
//
//   STEP 1 — Convert the message string to bytes
//     → Use stringToBuffer(message)
//     → Must be the EXACT same bytes as used during signing
//     → If the message has been modified even by one character,
//       verify() will return false
//
//   STEP 2 — Convert the signature from Base64 to ArrayBuffer
//     → Use fromBase64(signatureBase64)
//
//   STEP 3 — Verify the signature
//     → Call crypto.subtle.verify() with FOUR arguments:
//         Arg 1: algorithm object
//           { name: "ECDSA", hash: "SHA-384" }
//           → Must EXACTLY match what was used in sign()
//           → If you use SHA-256 here but SHA-384 in sign(),
//             verify() returns false even for a valid signature
//         Arg 2: publicKey  (the sender's public key)
//         Arg 3: the signature ArrayBuffer from Step 2
//         Arg 4: the message ArrayBuffer from Step 1
//     → Returns a Promise<boolean>
//     → true  = signature is valid, message is authentic
//     → false = signature is invalid, message may be tampered
//
//   STEP 4 — Return the boolean directly
//     → No conversion needed — it is already a boolean
//

export async function verifyMessage(
     message: string,
     signatureBase64: string,
     publicKey: CryptoKey
   ): Promise<boolean>{
    const arrybuf=stringToBuffer(message);
    const sigbuf=fromBase64(signatureBase64);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-384" },publicKey,sigbuf,arrybuf);


   }
// ── WHAT verify() CATCHES ─────────────────────────────────
// → Message was modified after signing       → returns false
// → Signature was modified                   → returns false
// → Wrong public key used to verify          → returns false
// → Correct message + correct key + valid sig → returns true
//
// ── COMMON MISTAKES ───────────────────────────────────────
// ✗ Using { hash: "SHA-256" } with P-384 keys
//     → P-384 uses SHA-384. Using SHA-256 is technically allowed
//       but non-standard. Use SHA-384 to match the curve.
//
// ✗ Argument ORDER in verify() is different from sign()
//     → sign() order:   algorithm, privateKey, data
//     → verify() order: algorithm, publicKey, signature, data
//     → Note that signature comes BEFORE data in verify()
//     → This is a common mistake — check MDN carefully
//
// ✗ Converting message to bytes differently in sign vs verify
//     → Both must use the same encoding (UTF-8 via TextEncoder)
//     → If sign() uses stringToBuffer() and verify() uses a
//       different method, the bytes will differ and verify returns false
//
// ── AFTER WRITING ─────────────────────────────────────────
// Write signing.test.ts immediately. The key tests are:
//   1. sign then verify → true
//   2. sign, modify message, verify → false
//   3. sign, modify signature, verify → false
