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

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function useEncryptedChat() {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (recipientId: string, plaintext: string) => {
      if (!plaintext.trim()) return;
      setIsSending(true);
      setSendError(null);
      try {
        const publicKeyB64 = await fetchPublicKey(recipientId);
        const recipientPublicKey = await importPublicKey(publicKeyB64);
        const encrypted = await encryptMessage(plaintext, recipientPublicKey);
        socket.emit("message:send", {
          encryptedPayload: encrypted.encryptedPayload,
          encryptedKey: encrypted.encryptedKey,
          iv: encrypted.iv,
          recipientId,
        } as SendMessagePayload);

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

  const sendFile = useCallback(async (recipientId: string, file: File) => {
    setSendError(null);
    if (file.size === 0) {
      setSendError("That file is empty.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setSendError(`File is too large (${mb} MB). Maximum is 50 MB.`);
      return;
    }

    setIsSending(true);
    try {
      let fileBytes: ArrayBuffer;
      try {
        fileBytes = await file.arrayBuffer();
      } catch {
        setSendError("Could not read that file.");
        return;
      }

      const publicKeyB64 = await fetchPublicKey(recipientId);
      const recipientPublicKey = await importPublicKey(publicKeyB64);
      const { encryptedData, encryptedKey, iv } = await encryptFile(
        fileBytes,
        recipientPublicKey,
      );

      let fileId: string;
      try {
        fileId = await uploadEncryptedFile(encryptedData);
      } catch (err: any) {
        setSendError(
          err?.response?.status === 413
            ? "File is too large. Maximum is 50 MB."
            : "Upload failed. Check your connection and try again.",
        );
        return;
      }

      const mimeType = file.type || "application/octet-stream";

      // Build a local blob URL the SENDER can view directly.
      const localUrl = URL.createObjectURL(
        new Blob([fileBytes], { type: mimeType }),
      );

      socket.emit("message:send", {
        encryptedPayload: "",
        encryptedKey,
        iv,
        recipientId,
        messageType: "file",
        fileId,
        fileName: file.name,
        mimeType,
      } as any);

      // ── OPTIMISTIC ADD with the REAL fileId + localUrl. ──
      // Using fileId as the message id means the server relay (which we
      // skip for our own messages) can't create a duplicate, and the
      // sender sees their own image immediately via localUrl.
      const currentUser = useMyStore.getState().user;
      if (currentUser) {
        useChatStore.getState().addMessage(recipientId, {
          id: fileId, // ← use fileId as the id (stable, unique)
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
          localUrl,
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
