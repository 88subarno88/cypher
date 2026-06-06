import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import {
  register,
  login,
  refreshAccessToken,
  logout,
} from "../services/authService";
import { logger } from "../lib/logger";

const router = Router();

// Zod schemas
const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
  publicKeyB64: z.string().min(100, "Invalid public key"),
});

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// POST /auth/register
router.post(
  "/register",
  validate(RegisterSchema),
  async (req: Request, res: Response) => {
    try {
      const user = await register(req.body);
      res.status(201).json({ user });
    } catch (err: any) {
      if (err.message === "Username already taken") {
        return res.status(409).json({ error: "Username already taken" });
      }
      logger.error("Register error", { error: err.message });
      res.status(500).json({ error: "Registration failed" });
    }
  },
);

//POST /auth/login
router.post(
  "/login",
  validate(LoginSchema),
  async (req: Request, res: Response) => {
    try {
      const authResponse = await login(req.body);
      res.json(authResponse);
    } catch (err: any) {
      if (err.message === "Invalid credentials") {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      logger.error("Login error", { error: err.message });
      res.status(500).json({ error: "Login failed" });
    }
  },
);

// POST /auth/refresh 
// Issues a new access token using the refresh token.
router.post(
  "/refresh",
  validate(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const accessToken = await refreshAccessToken(refreshToken);
      res.json({ accessToken });
    } catch (err: any) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  },
);

//  POST /auth/logout 
//  Blocklists the refresh token in Redis.
router.post(
  "/logout",
  validate(RefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      await logout(refreshToken);
      res.json({ message: "Logged out successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Logout failed" });
    }
  },
);

export default router;
