import { useState, useCallback } from "react";
import { encryptMessage } from "../crypto";
import { fetchPublicKey } from "../api/keys";
import { importPublicKey } from "../crypto";
import { useCryptoStore } from "../store/cryptoStore";
import { useChatStore } from "../store/chatStore"; 
import { useMyStore } from "../store/authStore"; 
import socket from "../socket/socket";
import type { SendMessagePayload } from "../../../shared/src";

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
        setSendError("Failed to send message");
        console.error(err);
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  return { sendMessage, isSending, sendError };
}
