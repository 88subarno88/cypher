import { useState, useCallback } from "react";
import { encryptMessage } from "../crypto";
import { encryptFile } from "../crypto/fileEncryption";
import { fetchPublicKey } from "../api/keys";
import { importPublicKey } from "../crypto";
import { uploadEncryptedFile } from "../api/files";
import { useChatStore } from "../store/chatStore";
import { useMyStore } from "../store/authStore";
import socket from "../socket/socket";
import type { SendMessagePayload } from "../../../shared/src";

// Keep in sync with the server limit in routes/files.ts
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function useEncryptedChat() {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Send a TEXT message 
  const sendMessage = useCallback(
    async (recipientId: string, plaintext: string) => {
      if (!plaintext.trim()) return;
      setIsSending(true);
      setSendError(null);
      try {
        const publicKeyB64 = await fetchPublicKey(recipientId);
        const recipientPublicKey = await importPublicKey(publicKeyB64);
        const encrypted = await encryptMessage(plaintext, recipientPublicKey);
        const payload: SendMessagePayload = {
          encryptedPayload: encrypted.encryptedPayload,
          encryptedKey: encrypted.encryptedKey,
          iv: encrypted.iv,
          recipientId,
        };
        socket.emit("message:send", payload);

        const currentUser = useMyStore.getState().user;
        if (currentUser) {
          useChatStore.getState().addMessage(recipientId, {
            id: Date.now().toString(),
            plaintext,
            senderId: currentUser.id,
            recipientId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        setSendError("Failed to send message. Please try again.");
        console.error(err);
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  //Send a FILE message (with full error handling)
  const sendFile = useCallback(async (recipientId: string, file: File) => {
    setSendError(null);

    // ── GUARD 1: empty file ──
    if (file.size === 0) {
      setSendError("That file is empty and can't be sent.");
      return;
    }

    // size check BEFORE encrypting/uploading
    // Catch oversize files locally so we don't waste time + memory
    // encrypting a huge file only for the server to reject it.
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setSendError(`File is too large (${mb} MB). Maximum is 50 MB.`);
      return;
    }

    setIsSending(true);
    try {
      // 1. Read file as bytes
      let fileBytes: ArrayBuffer;
      try {
        fileBytes = await file.arrayBuffer();
      } catch {
        setSendError("Could not read that file. It may be corrupted.");
        return;
      }

      // Encrypt with recipient's public key
      const publicKeyB64 = await fetchPublicKey(recipientId);
      const recipientPublicKey = await importPublicKey(publicKeyB64);
      const { encryptedData, encryptedKey, iv } = await encryptFile(
        fileBytes,
        recipientPublicKey,
      );

      //Upload the encrypted blob
      let fileId: string;
      try {
        fileId = await uploadEncryptedFile(encryptedData);
      } catch (err: any) {
        // Server may reject with 413 (too large) or 500
        if (err?.response?.status === 413) {
          setSendError("File is too large. Maximum is 50 MB.");
        } else {
          setSendError("Upload failed. Check your connection and try again.");
        }
        console.error("Upload error:", err);
        return;
      }

      // Emit the file message
      const mimeType = file.type || "application/octet-stream";
      const payload: any = {
        encryptedPayload: "",
        encryptedKey,
        iv,
        recipientId,
        messageType: "file",
        fileId,
        fileName: file.name,
        mimeType,
      };
      socket.emit("message:send", payload);

      //Optimistic add on sender side
      const currentUser = useMyStore.getState().user;
      if (currentUser) {
        useChatStore.getState().addMessage(recipientId, {
          id: Date.now().toString(),
          plaintext: "",
          senderId: currentUser.id,
          recipientId,
          timestamp: new Date().toISOString(),
          messageType: "file",
          fileId,
          fileName: file.name,
          mimeType,
          encryptedKey,
          iv,
        });
      }
    } catch (err: any) {
      setSendError("Failed to send file. Please try again.");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  }, []);

  return { sendMessage, sendFile, isSending, sendError };
}
