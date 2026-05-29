// ── WHAT IS THIS FILE? ────────────────────────────────────
// Four async functions for generating and converting RSA keys.
// This is the most important file on Day 1.
//
// ── KEY CONCEPT BEFORE YOU START ──────────────────────────
// "crypto" is a GLOBAL browser object — you never import it.
// crypto.subtle is the sub-object holding all crypto operations.
// All subtle operations return Promises — always use async/await.
// "CryptoKey" and "CryptoKeyPair" are built-in TypeScript DOM types —
// no import needed. They are available because tsconfig has "DOM" in lib.
//
// ── RESOURCES TO READ FIRST ───────────────────────────────
// Open ALL THREE before writing a single function:
//
// 1. MDN SubtleCrypto.generateKey() — the main reference:
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
//    Read: the parameter descriptions, the RSA-OAEP example,
//    what "extractable" means, what "usages" controls.
//
// 2. MDN SubtleCrypto.exportKey() — for the export functions:
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/exportKey
//    Read: what "spki" and "pkcs8" formats mean and when to use each.
//
// 3. MDN SubtleCrypto.importKey() — for the import functions:
//      https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
//    Read: how the parameters mirror those of generateKey().
//
// 4. WebCrypto examples — RSA-OAEP section (working copy-paste examples):
//      https://github.com/diafygi/webcrypto-examples#rsa-oaep---generatekey
//
// ── IMPORTS NEEDED ────────────────────────────────────────
// Import RSA_ALGORITHM from "@/utils/constants"
// Import toBase64 and fromBase64 from "@/utils/arrayBuffer"
// (@/ resolves to client/src/ via the alias in vite.config.ts)
//
import { RSA_ALGORITHM } from "../utils/constants";
import { toBase64, fromBase64 } from "../utils/arraybuffer";
// ── FUNCTION 1: generateUserKeyPair ───────────────────────
//   Signature: async function generateUserKeyPair(): Promise<CryptoKeyPair>
//
//   What it does:
//     → Generates a fresh RSA-OAEP key pair for a new user
//     → Called once at registration, never again (unless key rotation)
//
//   How to write it:
//     → Call crypto.subtle.generateKey() with three arguments:
//         Arg 1: RSA_ALGORITHM (the constant you imported)
//         Arg 2: true  ← extractable — MUST be true so you can
//                  exportKey() later (for server upload and IndexedDB storage)
//                  If false, exportKey() throws an error
//         Arg 3: ["encrypt", "decrypt"]  ← usages array
//                  The browser assigns "encrypt" to publicKey
//                  and "decrypt" to privateKey automatically
//     → Return the result directly (it is already a CryptoKeyPair)
//
//   What to watch out for:
//     → This takes 1-3 seconds for RSA-4096 — that is normal
//     → Do NOT call this on every page load — only on registration
//

export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
}
// ── FUNCTION 2: exportPublicKey ───────────────────────────
//   Signature: async function exportPublicKey(key: CryptoKey): Promise<string>
//
//   What it does:
//     → Converts a CryptoKey (public) → Base64 string
//     → Called after generateUserKeyPair() to get a string
//       that can be sent to the server and stored in the database
//
//   How to write it:
//     → Call crypto.subtle.exportKey() with two arguments:
//         Arg 1: "spki"  ← format for public keys
//                  SPKI = SubjectPublicKeyInfo
//                  Standard container for RSA public keys
//                  The result always starts with "MIIE" when Base64 encoded
//         Arg 2: key  ← the CryptoKey to export
//     → exportKey returns Promise<ArrayBuffer>
//     → Pass that ArrayBuffer to toBase64() and return the result
//
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return toBase64(await crypto.subtle.exportKey("spki", key));
}

// ── FUNCTION 3: exportPrivateKey ──────────────────────────
//   Signature: async function exportPrivateKey(key: CryptoKey): Promise<ArrayBuffer>
//
//   What it does:
//     → Converts a CryptoKey (private) → raw bytes (ArrayBuffer)
//     → NOT Base64 — the caller immediately encrypts these bytes
//       with PBKDF2 before storing. Never stored as plain bytes.
//
//   How to write it:
//     → Call crypto.subtle.exportKey() with:
//         Arg 1: "pkcs8"  ← format for private keys
//                  PKCS#8 = standard container for private keys
//                  Must match the format used in importPrivateKey()
//         Arg 2: key
//     → Return the ArrayBuffer directly (no Base64 conversion)
//
export async function exportPrivateKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("pkcs8", key);
}

// ── FUNCTION 4: importPublicKey ───────────────────────────
//   Signature: async function importPublicKey(spkiBase64: string): Promise<CryptoKey>
//
//   What it does:
//     → Reverse of exportPublicKey
//     → Converts a Base64 SPKI string (from the server) back to
//       a usable CryptoKey so you can encrypt a message with it
//
//   How to write it:
//     → First convert the Base64 string to ArrayBuffer using fromBase64()
//     → Then call crypto.subtle.importKey() with FIVE arguments:
//         Arg 1: "spki"  ← must match the export format
//         Arg 2: the ArrayBuffer from fromBase64()
//         Arg 3: { name: "RSA-OAEP", hash: "SHA-256" }
//                  ← must match the algorithm used in generateKey()
//                  ← COMMON MISTAKE: if this does not match, importKey throws
//         Arg 4: true   ← extractable
//         Arg 5: ["encrypt"]  ← public key can only encrypt, not decrypt
//     → Return the resulting CryptoKey
//
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromBase64(spkiBase64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );
}

// ── FUNCTION 5: importPrivateKey ──────────────────────────
//   Signature: async function importPrivateKey(pkcs8Buffer: ArrayBuffer): Promise<CryptoKey>
//
//   What it does:
//     → Reverse of exportPrivateKey
//     → Called on Day 3 after PBKDF2 decrypts the stored private key
//     → Converts raw PKCS8 bytes back to a usable CryptoKey
//
//   How to write it:
//     → Call crypto.subtle.importKey() with FIVE arguments:
//         Arg 1: "pkcs8"  ← must match the export format
//         Arg 2: pkcs8Buffer  ← the raw bytes (already an ArrayBuffer)
//         Arg 3: { name: "RSA-OAEP", hash: "SHA-256" }
//         Arg 4: true
//         Arg 5: ["decrypt"]  ← private key can only decrypt, not encrypt
//     → Return the resulting CryptoKey
//
//   What to watch out for:
//     → The usages array MUST be ["decrypt"] not ["encrypt", "decrypt"]
//     → The browser enforces usages — using a key for an unlisted
//       operation throws immediately (a feature, not a bug)
//

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
// ── EXPORT ALL FUNCTIONS ──────────────────────────────────
// Put "export" before "async function" on each one so they
// can be imported in keyManagement.test.ts and via crypto/index.ts
