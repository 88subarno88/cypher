import apiClient from "./client";
import type {
  EncryptedMessage,
  SendMessagePayload,
} from "../../../shared/src/types/message";

// GET /messages/:otherUserId — conversation history (encrypted)
export async function fetchHistory(
  conversationId: string,
): Promise<EncryptedMessage[]> {
  const response = await apiClient.get(`/messages/${conversationId}`);
  return response.data.messages;
}

// POST /messages — HTTP fallback send
export async function sendEncrypted(
  payload: SendMessagePayload,
): Promise<void> {
  await apiClient.post("/messages", payload);
}

// GET /users/search?q= — find users to chat with
export async function searchUsers(
  query: string,
): Promise<{ id: string; username: string }[]> {
  if (!query.trim()) return [];
  const response = await apiClient.get(
    `/users/search?q=${encodeURIComponent(query)}`,
  );
  return response.data.users;
}

//GET /messages/conversations/list 
// Returns the users you've already chatted with, so the sidebar
// can be populated when the app loads (even after a fresh login).
export async function fetchConversations(): Promise<
  { id: string; username: string }[]
> {
  const response = await apiClient.get("/messages/conversations/list");
  return response.data.conversations;
}
