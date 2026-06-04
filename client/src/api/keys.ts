import apiClient from "./client";
import type { PublicKeyResponse } from "../../../shared/src/types/user";

export async function fetchPublicKey(userId: string): Promise<string> {
  const response = await apiClient.get<PublicKeyResponse>(`/keys/${userId}`);
  return response.data.publicKeyB64; //the Base64 SPKI public key string
}
