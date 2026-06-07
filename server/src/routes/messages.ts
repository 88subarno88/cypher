// server/src/routes/messages.ts
import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { fetchHistory } from "../services/messageService";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

const router = Router();

const MessageSchema = z.object({
  encryptedPayload: z.string().min(1),
  encryptedKey: z.string().min(1),
  iv: z.string().min(1),
  recipientId: z.string().min(1),
});

// GET /messages/conversations/list
// Returns the list of distinct users the current user has
// exchanged messages with, so the sidebar can be rebuilt on load.
// MUST be defined BEFORE the /:otherUserId route, otherwise
// "conversations" would be treated as a userId param.
router.get(
  "/conversations/list",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Find all messages where I am sender or recipient
      const messages = await prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { recipientId: userId }],
        },
        orderBy: { createdAt: "desc" },
        select: {
          senderId: true,
          recipientId: true,
          createdAt: true,
        },
      });

      // Collect the OTHER user's id from each message, keeping the
      // most recent timestamp per partner (messages are desc ordered)
      const partnerIds: string[] = [];
      const seen = new Set<string>();
      for (const m of messages) {
        const otherId = m.senderId === userId ? m.recipientId : m.senderId;
        if (otherId === userId) continue; // skip self
        if (!seen.has(otherId)) {
          seen.add(otherId);
          partnerIds.push(otherId);
        }
      }

      // Fetch usernames for those partners
      const partners = await prisma.user.findMany({
        where: { id: { in: partnerIds } },
        select: { id: true, username: true },
      });

      // Keep the order by most recent (partnerIds order)
      const ordered = partnerIds
        .map((id) => partners.find((p) => p.id === id))
        .filter((p): p is { id: string; username: string } => !!p);

      res.json({ conversations: ordered });
    } catch (err: any) {
      logger.error("Failed to list conversations", { error: err.message });
      res.status(500).json({ error: "Failed to list conversations" });
    }
  },
);

// GET /messages/:otherUserId — conversation history
router.get(
  "/:otherUserId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { otherUserId } = req.params;
      const messages = await fetchHistory(userId, otherUserId);
      res.json({ messages });
    } catch (err: any) {
      logger.error("Failed to fetch history", { error: err.message });
      res.status(500).json({ error: "Failed to fetch message history" });
    }
  },
);

// POST /messages — HTTP fallback
router.post(
  "/",
  authMiddleware,
  validate(MessageSchema),
  async (req: Request, res: Response) => {
    try {
      res.status(201).json({ message: "Message queued" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to send message" });
    }
  },
);

export default router;
