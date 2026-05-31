import { useCallback } from "react";
import { openDB } from "idb";

import {
  generateUserKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  deriveKeyFromPassword,
  generateSalt,
} from "../crypto";
import { useCryptoStore } from "../store/cryptoStore";
import {
  IDB_NAME,
  IDB_VERSION,
  IDB_STORE,
  GCM_IV_LENGTH,
} from "../utils/constants";
import { toBase64, fromBase64 } from "../utils/arraybuffer";

async function openKeyStore() {
  return openDB(IDB_NAME, IDB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    },
  });
}

export function useKeyPair() {

  const saveKeyPair = useCallback(async (password: string) => {
    const pair = await generateUserKeyPair();
    const salt = generateSalt();
    const aesKey = await deriveKeyFromPassword(password, salt);
    const pkcs8Bytes = await exportPrivateKey(pair.privateKey);
    const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      pkcs8Bytes
    );
    const publicKeyB64 = await exportPublicKey(pair.publicKey);
    const db = await openKeyStore();
    await db.put(
      IDB_STORE,
      {
        encryptedPrivateKey: toBase64(encryptedBytes),
        iv: toBase64(iv.buffer),
        salt: toBase64(salt instanceof Uint8Array ? (salt.buffer as ArrayBuffer) : (salt as ArrayBuffer)),
        publicKeyB64,
      },
      "userKeyData" 
    );
    useCryptoStore.getState().setKeyPair(pair);
  }, []);

  const loadKeyPair = useCallback(async (password: string): Promise<boolean> => {
    const db = await openKeyStore();
    const stored = await db.get(IDB_STORE, "userKeyData");
    if (!stored) return false;
    const salt = fromBase64(stored.salt);
    const iv = fromBase64(stored.iv);
    const encryptedPrivateKey = fromBase64(stored.encryptedPrivateKey);
    const aesKey = await deriveKeyFromPassword(password, new Uint8Array(salt));
    let pkcs8Bytes: ArrayBuffer;
    try {
      pkcs8Bytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        aesKey,
        encryptedPrivateKey
      );
    } catch (error) {
      console.error("Decryption failed. Incorrect password.");
      return false; 
    }

    const privateKey = await importPrivateKey(pkcs8Bytes);
    const publicKey = await importPublicKey(stored.publicKeyB64);
    useCryptoStore.getState().setKeyPair({ privateKey, publicKey });
    
    return true; 
  }, []);

  return { saveKeyPair, loadKeyPair };
}