import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import redis from "../lib/redis";
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  TokenPayload,
} from "@cipher/shared";

export async function register(
  dto: RegisterDTO,
): Promise<{ id: string; username: string }> {
  const existing = await prisma.user.findUnique({
    where: { username: dto.username },
  });
  if (existing) throw new Error("Username already taken");

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const user = await prisma.user.create({
    data: {
      username: dto.username,
      passwordHash,
      publicKeyB64: dto.publicKeyB64,
    },
  });

  return { id: user.id, username: user.username };
}

export async function login(dto: LoginDTO): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { username: dto.username },
  });

  // Same error for "user not found" and "wrong password"
  // This prevents username enumeration attacks
  if (!user) throw new Error("Invalid credentials");

  const isValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isValid) throw new Error("Invalid credentials");

  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
  };

  // Access token 15 min
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });

  // Refresh token 7 days
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username },
  };
}

// Validates the refresh token, checks Redis blocklist,
// issues a new access token.
export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  // Check if this refresh token has been blocklisted
  const isBlocklisted = await redis.get(`blocklist:${refreshToken}`);
  if (isBlocklisted) throw new Error("Token has been revoked");

  // Verify the refresh token signature
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    ) as TokenPayload;
  } catch {
    throw new Error("Invalid refresh token");
  }

  // Issue a fresh access token
  const newAccessToken = jwt.sign(
    { userId: decoded.userId, username: decoded.username },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" },
  );

  return newAccessToken;
}

// ── logout ────────────────────────────────────────────────
// Day 9: Adds the refresh token to Redis blocklist so it
// cannot be used to get new access tokens after logout.
export async function logout(refreshToken: string): Promise<void> {
  // Store in Redis for 7 days (the token's remaining lifetime)
  // After 7 days the token would be expired anyway so no need to keep it
  await redis.set(`blocklist:${refreshToken}`, "1", "EX", 60 * 60 * 24 * 7);
}
