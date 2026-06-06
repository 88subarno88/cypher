// server/src/routes/users.ts
// Adds GET /users/:userId alongside the existing /users/search route.

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /users/search?q=<query>  — existing search route
router.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.json({ users: [] });
    }
    const users = await prisma.user.findMany({
      where: {
        username: { contains: q.trim(), mode: "insensitive" },
        NOT: { id: req.user!.userId },
      },
      select: { id: true, username: true },
      take: 15,
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /users/:userId — look up one user by id
// Used by the socket handler to resolve a sender's username
// when a message arrives (the socket payload only has IDs).
router.get("/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }, // never expose passwordHash/keys
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
