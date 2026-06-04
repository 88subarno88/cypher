import socket from "./socket";
import { decryptMessage } from "../crypto";
import { useCryptoStore } from "../store/cryptoStore";
import { useChatStore } from "../store/chatStore";
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
      useChatStore.getState().addMessage(payload.senderId, decrypted); //senderId==conversionId as message A->B decypted by A's id (sender id)
    } catch {
      console.log("Failed to decrypt message ,key is wrong");
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
