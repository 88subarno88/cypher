import apiClient from "./client";
import type {
  EncryptedMessage,
  SendMessagePayload,
} from "../../../shared/src/types/message";

// Calls GET /messages/:otherUserId on the Express server.
// Returns an array of ENCRYPTED message objects.
// Chat.tsx then decrypts each one before displaying.

export async function fetchHistory(
  conversationId: string,
): Promise<EncryptedMessage[]> {
  const response = await apiClient.get(`/messages/${conversationId}`);
  return response.data.messages; // server returns { messages: EncryptedMessage[] }
}


// Calls POST /messages on the Express server.
// Used as a fallback when the socket is disconnected.
// Normal sends still go through socket.emit() in useEncryptedChat.ts.
export async function sendEncrypted(
  payload: SendMessagePayload,
): Promise<void> {
  await apiClient.post("/messages", payload);
}


// Calls GET /users/search?q=<query> on the Express server.
// Used by ConversationList to find users to chat with.
// Returns only safe UserProfile fields — no passwordHash, no keys.
export async function searchUsers(
  query: string,
): Promise<{ id: string; username: string }[]> {
  if (!query.trim()) return [];

  const response = await apiClient.get(
    `/users/search?q=${encodeURIComponent(query)}` // encodeURIComponent handles spaces and special chars
  );
  return response.data.users; // server returns { users: UserProfile[] }
}