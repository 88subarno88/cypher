import { Server, Socket } from "socket.io";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";
import type { SendMessagePayload, EncryptedMessage } from "@cipher/shared";

export function registerChatHandlers(io: Server, socket: Socket): void {
  socket.on("message:send", async (payload: SendMessagePayload) => {
    const senderId = socket.data.user.userId;

    // For TEXT messages encryptedPayload is required.
    // For FILE messages encryptedPayload is "" — so we require
    // encryptedKey + iv + recipientId, and allow empty payload
    // when messageType is "file".
    const isFile = (payload as any).messageType === "file";
    if (
      (!payload.encryptedPayload && !isFile) ||
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
          encryptedPayload: payload.encryptedPayload ?? "",
          encryptedKey: payload.encryptedKey,
          iv: payload.iv,
          senderId,
          recipientId: payload.recipientId,
          messageType: (payload as any).messageType ?? "text",
          fileId: (payload as any).fileId ?? null,
          fileName: (payload as any).fileName ?? null,
          mimeType: (payload as any).mimeType ?? null,
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
        messageType: saved.messageType as "text" | "file",
        fileId: saved.fileId ?? undefined,
        fileName: saved.fileName ?? undefined,
        mimeType: saved.mimeType ?? undefined,
      };

      io.to(payload.recipientId).emit("message:receive", messageToRelay);
      logger.info("Message relayed", {
        messageId: saved.id,
        senderId,
        recipientId: payload.recipientId,
        type: saved.messageType,
      });
    } catch (err: any) {
      logger.error("Failed to save/relay message", { error: err.message });
      socket.emit("error", { message: "Failed to send message" });
    }
  });
}
