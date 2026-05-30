// ── WHAT IS THIS FILE? ────────────────────────────────────
// A React custom hook that handles saving and restoring the RSA
// private key from IndexedDB across page reloads.
//
// This is the most complex file on Day 3.
// Take it function by function — do not try to write it all at once.
//
// ── THE FULL FLOW THIS HOOK MANAGES ───────────────────────
// AT REGISTRATION (called from Register.tsx on Day 4):
//   1. generateUserKeyPair()                → RSA key pair (CryptoKeyPair)
//   2. generateSalt()                       → random 32-byte salt
//   3. deriveKeyFromPassword(password, salt) → AES key
//   4. exportPrivateKey(pair.privateKey)    → raw PKCS8 bytes (ArrayBuffer)
//   5. encrypt(PKCS8 bytes) with AES key   → encrypted bytes
//   6. store in IndexedDB:
//        { encryptedPrivateKey: Base64, salt: Base64, publicKeyB64: string }
//   7. put the full key pair in cryptoStore → ready to use
//
// AT LOGIN (called from Login.tsx on Day 4):
//   1. load stored record from IndexedDB
//   2. fromBase64(salt) → Uint8Array
//   3. deriveKeyFromPassword(password, salt) → same AES key
//   4. decrypt encrypted private key bytes with AES key → PKCS8 bytes
//   5. importPrivateKey(PKCS8 bytes) → CryptoKey
//   6. importPublicKey(publicKeyB64) → CryptoKey
//   7. reconstruct CryptoKeyPair from publicKey + privateKey
//   8. put in cryptoStore → ready to use
//
// ── RESOURCES TO READ FIRST ───────────────────────────────
// 1. 'idb' npm library by Jake Archibald (IndexedDB wrapper):
//      https://github.com/jakearchibald/idb
//    Read the README fully before writing any IndexedDB code.
//    Key functions: openDB(), db.put(), db.get()
//    Install it: npm i idb  (from inside client/ folder)
//
// 2. MDN IndexedDB guide (to understand what idb wraps):
//      https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
//    Read "Opening a database" and "Adding data to the database"
//    so you understand what openDB() and put() are doing underneath.
//
// 3. React useEffect docs:
//      https://react.dev/learn/synchronizing-with-effects
//    This hook uses useEffect to attempt key restoration on mount.
//
// ── IMPORTS YOU WILL NEED ─────────────────────────────────
// From "idb":
//   openDB
//
// From "@/crypto":
//   generateUserKeyPair, exportPublicKey, exportPrivateKey,
//   importPublicKey, importPrivateKey, deriveKeyFromPassword, generateSalt
//
// From "@/store/cryptoStore":
//   useCryptoStore
//
// From "@/utils/constants":
//   IDB_NAME, IDB_VERSION, IDB_STORE, GCM_IV_LENGTH
//
// From "@/utils/arrayBuffer":
//   toBase64, fromBase64
//
// From "react":
//   useState, useEffect, useCallback
//
// ── HELPER: openKeyStore ──────────────────────────────────
// Write a small helper function (not exported) that opens the IndexedDB:
//
//   async function openKeyStore() {
//     return openDB(IDB_NAME, IDB_VERSION, {
//       upgrade(db) {
//         if (!db.objectStoreNames.contains(IDB_STORE)) {
//           db.createObjectStore(IDB_STORE)
//         }
//       },
//     })
//   }
//
//   → IDB_NAME, IDB_VERSION, IDB_STORE come from constants.ts
//   → The upgrade callback runs only if the database is new or version changed
//   → createObjectStore creates the "table" where you store key data
//   → Call this before every get/put operation
//
// ── WHAT THE HOOK RETURNS ─────────────────────────────────
// The hook should return an object with two functions:
//
//   {
//     saveKeyPair: (password: string) => Promise<void>
//     loadKeyPair:  (password: string) => Promise<boolean>
//   }
//
//   saveKeyPair  → called at registration with the user's password
//   loadKeyPair  → called at login; returns true if successful, false if failed
//
// ── FUNCTION 1: saveKeyPair ───────────────────────────────
//
// Signature (inside the hook):
//   const saveKeyPair = useCallback(async (password: string) => {
//     ...
//   }, [])
//
// HOW TO WRITE IT (step by step):
//
//   STEP 1 — Generate a fresh RSA key pair
//     → const pair = await generateUserKeyPair()
//
//   STEP 2 — Generate a random salt for PBKDF2
//     → const salt = generateSalt()  ← synchronous, no await
//
//   STEP 3 — Derive an AES key from the password + salt
//     → const aesKey = await deriveKeyFromPassword(password, salt)
//
//   STEP 4 — Export the private key to raw PKCS8 bytes
//     → const pkcs8Bytes = await exportPrivateKey(pair.privateKey)
//     → This gives you an ArrayBuffer of the raw private key
//
//   STEP 5 — Encrypt the PKCS8 bytes with the AES key
//     → Generate a random IV first:
//         const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH))
//     → Encrypt:
//         const encryptedBytes = await crypto.subtle.encrypt(
//           { name: "AES-GCM", iv },
//           aesKey,
//           pkcs8Bytes
//         )
//
//   STEP 6 — Export the public key as Base64 SPKI string
//     → const publicKeyB64 = await exportPublicKey(pair.publicKey)
//
//   STEP 7 — Store everything in IndexedDB
//     → Open the store: const db = await openKeyStore()
//     → Put one record with all the fields you need for login:
//         await db.put(IDB_STORE, {
//           encryptedPrivateKey: toBase64(encryptedBytes),
//           iv: toBase64(iv),
//           salt: toBase64(salt),
//           publicKeyB64,
//         }, "userKeyData")
//     → "userKeyData" is the key (like a row ID) for this record
//     → There is only ever ONE record — one user, one key pair
//
//   STEP 8 — Load the key pair into the cryptoStore
//     → Call useCryptoStore.getState().setKeyPair(pair)
//     → getState() gets the store outside of React rendering
//     → This makes the key pair immediately available in memory
//
// ── FUNCTION 2: loadKeyPair ───────────────────────────────
//
// Signature (inside the hook):
//   const loadKeyPair = useCallback(async (password: string): Promise<boolean> => {
//     ...
//   }, [])
//
// Returns true if the key was loaded successfully, false if not.
//
// HOW TO WRITE IT (step by step):
//
//   STEP 1 — Open IndexedDB and read the stored record
//     → const db = await openKeyStore()
//     → const stored = await db.get(IDB_STORE, "userKeyData")
//     → If stored is undefined (nothing saved yet), return false immediately
//
//   STEP 2 — Decode the Base64 values back to bytes
//     → const salt = fromBase64(stored.salt)  ← ArrayBuffer
//     → const iv = fromBase64(stored.iv)      ← ArrayBuffer
//     → const encryptedPrivateKey = fromBase64(stored.encryptedPrivateKey)
//
//   STEP 3 — Re-derive the AES key from the password + stored salt
//     → Convert salt ArrayBuffer to Uint8Array:
//         new Uint8Array(salt)
//     → const aesKey = await deriveKeyFromPassword(password, new Uint8Array(salt))
//     → If the user's password is correct, this produces the SAME AES key
//       that was used to encrypt the private key at registration
//
//   STEP 4 — Decrypt the stored private key
//     → Wrap this in try/catch — if the password is wrong, this throws
//     → const pkcs8Bytes = await crypto.subtle.decrypt(
//         { name: "AES-GCM", iv: new Uint8Array(iv) },
//         aesKey,
//         encryptedPrivateKey
//       )
//     → If it throws, catch the error and return false
//       (wrong password — do not crash, just tell the caller it failed)
//
//   STEP 5 — Import the decrypted bytes back into a CryptoKey
//     → const privateKey = await importPrivateKey(pkcs8Bytes)
//
//   STEP 6 — Import the public key from the stored Base64 string
//     → const publicKey = await importPublicKey(stored.publicKeyB64)
//
//   STEP 7 — Put the key pair in the cryptoStore
//     → useCryptoStore.getState().setKeyPair({ privateKey, publicKey })
//     → Return true (success)
//
// ── WHAT THE HOOK EXPORTS ─────────────────────────────────
//   export function useKeyPair() {
//     return { saveKeyPair, loadKeyPair }
//   }
//
// ── COMMON MISTAKES ───────────────────────────────────────
// ✗ Forgetting to store the IV alongside the encrypted key
//     → You cannot decrypt without the IV that was used during encryption
//     → Store it in IndexedDB with the encrypted key
//
// ✗ Storing a new salt on load instead of reading the stored one
//     → A new salt = a different AES key = decryption fails every time
//     → The salt must be loaded from IndexedDB at login, not regenerated
//
// ✗ Not wrapping the decrypt step in try/catch
//     → Wrong password causes crypto.subtle.decrypt() to throw
//     → Without try/catch, the whole hook crashes
//     → With try/catch, you return false and let the UI show "wrong password"
//
// ✗ Calling useCryptoStore() inside useCallback
//     → useCallback runs outside React's render cycle
//     → Use useCryptoStore.getState() instead (accesses store imperatively)