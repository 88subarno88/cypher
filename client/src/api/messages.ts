import apiClient from "./client";
import type {
  EncryptedMessage,
  SendMessagePayload,
} from "../../../shared/src/types/message";

export async function fetchHistory(
  conversationId: string,
): Promise<EncryptedMessage[]> {
  return [];
}

export async function sendEncrypted(
  payload: SendMessagePayload,
): Promise<void> {
  return;
}
