import apiClient from "./client";
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
} from "../../../shared/src/types/auth";
import { useMyStore } from "../store/authStore";

export async function register(
  dto: RegisterDTO,
): Promise<{ id: string; username: string }> {
  const response = await apiClient.post("/auth/register", dto);
  return response.data.user;
}

export async function login(dto: LoginDTO): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/login", dto);
  return response.data;
}

export async function refreshToken(): Promise<string> {
  const { refreshToken: storedRefreshToken } = useMyStore.getState();
  if (!storedRefreshToken) {
    throw new Error("No refresh token");
  }
  const response = await apiClient.post("/auth/refresh", {
    refreshToken: storedRefreshToken,
  });
  return response.data.accessToken;
}
