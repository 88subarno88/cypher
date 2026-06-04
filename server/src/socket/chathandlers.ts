import { Server, Socket } from "socket.io";
import prisma from "../lib/prisma";
import {logger} from "../lib/logger";
import type { SendMessagePayload, EncryptedMessage } from "@cipher/shared";


export function registerChatHandlers(io: Server, socket: Socket): void {
  socket.on("message:send", async (payload: SendMessagePayload) => {
    const senderId = socket.data.user.userId;
    if (
      !payload.encryptedPayload ||
      !payload.encryptedKey ||
      !payload.iv ||
      !payload.recipientId
    ) {
      socket.emit("error", { message: "Invalid message payload" });
      return;
    }
    try {
      const saved = await prisma.message.create({
        data: {
          encryptedPayload: payload.encryptedPayload,
          encryptedKey: payload.encryptedKey,
          iv: payload.iv,
          senderId,
          recipientId: payload.recipientId,
        },
      });
      const messageToRelay: EncryptedMessage = {
        id: saved.id,
        encryptedPayload: saved.encryptedPayload,
        encryptedKey: saved.encryptedKey,
        iv: saved.iv,
        senderId: saved.senderId,
        recipientId: saved.recipientId,
        createdAt: saved.createdAt.toISOString(),
      };
      io.to(payload.recipientId).emit("message:receive", messageToRelay);
      logger.info("Message relayed", {
        messageId: saved.id,
        senderId,
        recipientId: payload.recipientId,
      });
    } catch (err: any) {
      logger.error("Failed to save/relay message", { error: err.message });
      socket.emit("error", { message: "Failed to send message" });
    }
  });
}
