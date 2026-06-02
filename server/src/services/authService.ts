import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  TokenPayload,
} from "@cipher/shared";

export async function register(
  dto: RegisterDTO,
): Promise<{ id: string; username: string }> {
  //  Check if username is already taken
  const existing = await prisma.user.findUnique({
    where: { username: dto.username },
  });

  if (existing) {
    // This exact string is caught by  routes/auth.ts to return a 409 status
    throw new Error("Username already taken");
  }

  // Hash the password with bcrypt (12 salt rounds)
  const passwordHash = await bcrypt.hash(dto.password, 12);

  //Create the user in PostgreSQL
  const user = await prisma.user.create({
    data: {
      username: dto.username,
      passwordHash,
      publicKeyB64: dto.publicKeyB64,
    },
  });

  // Return safe user data (NEVER return the hash or public key here)
  return { id: user.id, username: user.username };
}

export async function login(dto: LoginDTO): Promise<AuthResponse> {
  // Find the user by username
  const user = await prisma.user.findUnique({
    where: { username: dto.username },
  });

  // If user doesn't exist, throw generic error
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Compare the password
  const isValid = await bcrypt.compare(dto.password, user.passwordHash);

  // If wrong password, throw the EXACT SAME generic error
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Create the JWT payload
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
  };

  // ensure environment variables exist before signing
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    logger.error("Missing JWT secrets in environment variables");
    throw new Error("Internal server error");
  }

  // Sign the access token (short-lived: 15 minutes)
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  // Sign the refresh token (longer-lived: 7 days)
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  // Return the AuthResponse
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
    },
  };
}
