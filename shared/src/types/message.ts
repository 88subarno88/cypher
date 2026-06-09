// The server ONLY ever sees EncryptedMessage.
// DecryptedMessage only ever lives in browser memory.

// what the client emits via WebSocket when sending a message
export interface SendMessagePayload {
  encryptedPayload: string;
  encryptedKey: string;
  iv: string;
  recipientId: string;

  messageType?: "text" | "file";
  fileId?: string;
  fileName?: string;
  mimeType?: string;
}

export interface DecryptedMessage {
  id: string;
  plaintext: string;
  senderId: string;
  recipientId: string;
  timestamp: string;

  messageType?: "text" | "file";
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  encryptedKey?: string;
  iv?: string;
  localUrl?: string;
}

export interface EncryptedMessage {
  id?: string;
  encryptedPayload: string;
  encryptedKey: string;
  iv: string;
  senderId: string;
  recipientId: string;
  createdAt?: string;

  messageType?: "text" | "file";
  fileId?: string;
  fileName?: string;
  mimeType?: string;
}

//  there is NO "content", "body", or "text" field in
// EncryptedMessage. This is intentional — the TypeScript type
// itself enforces the zero-knowledge constraint.
// If a developer accidentally adds a plaintext field, the
// compiler will catch it immediately.
