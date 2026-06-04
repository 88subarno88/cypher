import prisma from "../lib/prisma";
import type { SendMessagePayload, EncryptedMessage } from "../../../shared/src/types/message";

// Called by chatHandler.ts (socket) when a message is sent.
// senderId comes from socket.data.user.userId (verified JWT) —
// NEVER from the client payload (prevents spoofing).
export async function saveMessage(
  payload: SendMessagePayload,
  senderId: string
): Promise<EncryptedMessage> {
  const saved = await prisma.message.create({
    data: {
      encryptedPayload: payload.encryptedPayload,
      encryptedKey:     payload.encryptedKey,
      iv:               payload.iv,
      senderId,                        
      recipientId:      payload.recipientId,
    },
  });

  return {
    id:               saved.id,
    encryptedPayload: saved.encryptedPayload,
    encryptedKey:     saved.encryptedKey,
    iv:               saved.iv,
    senderId:         saved.senderId,
    recipientId:      saved.recipientId,
    createdAt:        saved.createdAt.toISOString(),
  };
}

// Called by GET /messages/:otherUserId route.
// Returns all messages between userId and otherUserId in
// both directions  sorted oldest first.
export async function fetchHistory(
  userId: string,
  otherUserId: string
): Promise<EncryptedMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        // Messages sent by userId to otherUserId
        { senderId: userId,      recipientId: otherUserId },
        // Messages sent by otherUserId to userId
        { senderId: otherUserId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" }, // oldest first so UI shows correct order
  });

  return messages.map((m) => ({
    id:               m.id,
    encryptedPayload: m.encryptedPayload,
    encryptedKey:     m.encryptedKey,
    iv:               m.iv,
    senderId:         m.senderId,
    recipientId:      m.recipientId,
    createdAt:        m.createdAt.toISOString(),
  }));
}