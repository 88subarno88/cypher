// server/src/routes/users.ts
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /users/search?q=<query>
router.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;

    // log exactly what query arrives
    console.log("SEARCH query received:", JSON.stringify(q));

    // Return empty for blank/missing query
    if (!q || !q.trim()) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q.trim(),
          mode: "insensitive", // case-insensitive partial match
        },
        NOT: { id: req.user!.userId },
      },
      select: { id: true, username: true },
      take: 15,
    });

    console.log("SEARCH found", users.length, "users for query:", q);
    res.json({ users });
  } catch (err: any) {
    console.error("SEARCH error:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /users/:userId — look up one user by id
router.get("/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
