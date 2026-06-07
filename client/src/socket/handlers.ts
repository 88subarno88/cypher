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

    // When I send a message, useEncryptedChat already adds it to my
    // store optimistically. The server may also relay it back to me.
    // If I process it here too, the message appears TWICE.
    // So: only handle messages where I am NOT the sender.
    if (payload.senderId === currentUserId) {
      return; // already added optimistically — skip
    }

    const keyPair = useCryptoStore.getState().keyPair;
    const privateKey = keyPair?.privateKey;
    if (!privateKey) {
      console.error("No private key — cannot decrypt");
      return;
    }

    try {
      const plaintext = await decryptMessage(payload, privateKey);
      const decrypted: DecryptedMessage = {
        id: payload.id!,
        plaintext,
        senderId: payload.senderId,
        recipientId: payload.recipientId,
        timestamp: payload.createdAt ?? new Date().toISOString(),
      };

      // I received this, so the other person is the sender
      const otherUserId = payload.senderId;
      console.log(
        "RECEIVE | senderId:",
        payload.senderId,
        "| recipientId:",
        payload.recipientId,
        "| myId:",
        currentUserId,
      );

      useChatStore.getState().addMessage(otherUserId, decrypted);

      // Resolve the sender's username so the sidebar/header show
      // the right name and avatar (payload only has IDs).
      const otherUsername = await getUsername(otherUserId);
      useChatStore.getState().addOrUpdateConversation({
        id: otherUserId,
        recipientId: otherUserId,
        recipientUsername: otherUsername,
        lastMessage: plaintext,
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
