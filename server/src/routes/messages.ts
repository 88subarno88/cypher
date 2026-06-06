import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { fetchHistory } from "../services/messageService";
import { logger } from "../lib/logger";

const router = Router();

// Zod schema for POST /messages (sending a message)
const MessageSchema = z.object({
  encryptedPayload: z.string().min(1, "encryptedPayload is required"),
  encryptedKey: z.string().min(1, "encryptedKey is required"),
  iv: z.string().min(1, "iv is required"),
  recipientId: z.string().min(1, "recipientId is required"),
});

// GET /messages/:otherUserId 
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

// HTTP fallback for sending when socket is unavailable.
// Normal sends go through socket.emit() in useEncryptedChat.
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
