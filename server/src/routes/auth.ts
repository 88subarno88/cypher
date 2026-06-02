import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { register, login } from "../services/authService";
import {logger} from "../lib/logger";

const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
  publicKeyB64: z.string().min(100), // RSA-4096 is ~900 chars
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const router = Router();

router.post(
  "/register",
  validate(RegisterSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await register(req.body);
      res.status(201).json({ user });
    } catch (error: any) {
      if (error.message === "Username already taken") {
        res.status(409).json({ error: "Username already taken" });
      } else {
        logger.error("Register error", { error: error.message });
        res.status(500).json({ error: "Registration failed" });
      }
    }
  },
);

router.post(
  "/login",
  validate(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const authResponse = await login(req.body);
      res.json(authResponse);
      // authResponse contains { accessToken, refreshToken, user };
    } catch (error: any) {
      if (error.message === "Invalid credentials") {
        res.status(401).json({ error: "Invalid credentials" });
      } else {
        logger.error("Login error", { error: error.message });
        res.status(500).json({ error: "Login failed" });
      }
    }
  },
);

router.post("/refresh", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});

export default router;
