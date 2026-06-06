import socket from "./socket";
import { decryptMessage } from "../crypto";
import { useCryptoStore } from "../store/cryptoStore";
import { useChatStore } from "../store/chatStore";
import { useMyStore } from "../store/authStore";
import type { EncryptedMessage, DecryptedMessage } from "../../../shared";

export function registerHandlers() {
  socket.on("message:receive", async (payload: EncryptedMessage) => {
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

      // When Bob receives Alice's message: senderId=Alice ->convo key = Alice
      // When Alice receives Bob's reply:   senderId=Bob   -> convo key = Bob
      const currentUserId = useMyStore.getState().user?.id;
      const conversationId =
        payload.senderId === currentUserId
          ? payload.recipientId // message I sent → key is recipient
          : payload.senderId; // message I received → key is sender

      useChatStore.getState().addMessage(conversationId, decrypted);
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
