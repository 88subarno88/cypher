import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { fetchHistory } from "../services/messageService";
import { logger } from "../lib/logger";

const router = Router();

// GET /messages/:otherUserId
// Returns full conversation history between logged-in user and otherUserId.
// Both users' messages included (sent and received).
router.get(
  "/:otherUserId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId; // from JWT via authMiddleware
      const { otherUserId } = req.params;

      const messages = await fetchHistory(userId, otherUserId);

      res.json({ messages });
    } catch (err: any) {
      logger.error("Failed to fetch history", { error: err.message });
      res.status(500).json({ error: "Failed to fetch message history" });
    }
  },
);

export default router;
