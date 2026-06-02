import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { fetchPublicKey } from "../services/keyService";

const router = Router();

router.get("/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const publicKeyB64 = await fetchPublicKey(userId);
    res.json({ publicKeyB64 });
    
  } catch (error: any) {

    if (error.message === "User not found") {
      res.status(404).json({ error: "User not found" });
    } else {
      console.error("Key fetch error:", error);
      res.status(500).json({ error: "Failed to fetch key" });
    }
  }
});

export default router;