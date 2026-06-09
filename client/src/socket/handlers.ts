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
  console.log("HANDLERS VERSION: simple-skip-own");

  socket.on("message:receive", async (payload: EncryptedMessage) => {
    const currentUserId = useMyStore.getState().user?.id;

    // ── Skip ALL of my own relayed messages (text AND file). ──
    // The sender already added an optimistic copy (text via sendMessage,
    // file via sendFile with localUrl). Processing the relay would dupe.
    if (payload.senderId === currentUserId) {
      return;
    }

    const isFile = payload.messageType === "file";

    try {
      let plaintext = "";
      if (!isFile) {
        const privateKey = useCryptoStore.getState().keyPair?.privateKey;
        if (!privateKey) {
          console.error("No private key — cannot decrypt");
          return;
        }
        plaintext = await decryptMessage(payload, privateKey);
      }

      const decrypted: DecryptedMessage = {
        id: payload.id!,
        plaintext,
        senderId: payload.senderId,
        recipientId: payload.recipientId,
        timestamp: payload.createdAt ?? new Date().toISOString(),
        messageType: payload.messageType ?? "text",
        fileId: payload.fileId,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        encryptedKey: payload.encryptedKey,
        iv: payload.iv,
      };

      // I received this → the other person is the sender.
      const otherUserId = payload.senderId;
      useChatStore.getState().addMessage(otherUserId, decrypted);

      const preview = isFile ? "📎 " + (payload.fileName ?? "file") : plaintext;
      const otherUsername = await getUsername(otherUserId);
      useChatStore.getState().addOrUpdateConversation({
        id: otherUserId,
        recipientId: otherUserId,
        recipientUsername: otherUsername,
        lastMessage: preview,
        lastMessageAt: decrypted.timestamp,
      });
    } catch (err) {
      console.error("Failed to handle incoming message", err);
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
