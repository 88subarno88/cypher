import socket from "./socket";
import { decryptMessage } from "../crypto";
import { useCryptoStore } from "../store/cryptoStore";
import { useChatStore } from "../store/chatStore";
import { useMyStore } from "../store/authStore";
import apiClient from "../api/client";
import type { EncryptedMessage, DecryptedMessage } from "../../../shared";

const usernameCache: Record<string, string> = {};

async function getUsername(userId: string): Promise<string> {
  if (usernameCache[userId]) return usernameCache[userId];
  try {
    const res = await apiClient.get(`/users/${userId}`);
    const name = res.data.user?.username ?? "Unknown";
    usernameCache[userId] = name;
    return name;
  } catch {
    return "Unknown";
  }
}

export function registerHandlers() {
  socket.on("message:receive", async (payload: EncryptedMessage) => {
    const currentUserId = useMyStore.getState().user?.id;

    // Skip my own relayed messages (already added optimistically)
    if (payload.senderId === currentUserId) {
      return;
    }

    const keyPair = useCryptoStore.getState().keyPair;
    const privateKey = keyPair?.privateKey;
    if (!privateKey) {
      console.error("No private key — cannot decrypt");
      return;
    }

    try {
      // For text: decrypt the payload. For file: no text payload.
      const isFile = payload.messageType === "file";
      let plaintext = "";
      if (!isFile) {
        plaintext = await decryptMessage(payload, privateKey);
      }

      const decrypted: DecryptedMessage = {
        id: payload.id!,
        plaintext,
        senderId: payload.senderId,
        recipientId: payload.recipientId,
        timestamp: payload.createdAt ?? new Date().toISOString(),
        //carry file fields so the UI can render the file
        messageType: payload.messageType ?? "text",
        fileId: payload.fileId,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        encryptedKey: payload.encryptedKey,
        iv: payload.iv,
      };

      const otherUserId = payload.senderId;
      useChatStore.getState().addMessage(otherUserId, decrypted);

      // Conversation preview: text for text messages, filename for files
      const preview = isFile ? "📎 " + (payload.fileName ?? "file") : plaintext;

      const otherUsername = await getUsername(otherUserId);
      useChatStore.getState().addOrUpdateConversation({
        id: otherUserId,
        recipientId: otherUserId,
        recipientUsername: otherUsername,
        lastMessage: preview,
        lastMessageAt: decrypted.timestamp,
      });
    } catch {
      console.error("Failed to decrypt incoming message");
    }
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return () => {
    socket.off("message:receive");
    socket.off("connect");
    socket.off("disconnect");
  };
}
