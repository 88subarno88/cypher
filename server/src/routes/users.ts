import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /users/search?q=<query>
// Returns users whose username contains the search query.
// Excludes the logged-in user from results.
router.get(
  "/search",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;

      // Return empty array for blank query
      if (!q || !q.trim()) {
        return res.json({ users: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          username: {
            contains: q.trim(),
            mode: "insensitive",
          },
          // Do not show the logged-in user in their own search results
          NOT: { id: req.user!.userId },
        },
        select: {
          id: true,
          username: true,
          // Never select passwordHash or publicKeyB64 here
        },
        take: 15, // max 15 results
      });

      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: "Search failed" });
    }
  }
);

export default router;