import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { useCryptoStore } from "../store/cryptoStore";
import { useMyStore } from "../store/authStore";
import { useEncryptedChat } from "../hooks/useEncryptedchat";
import { fetchHistory } from "../api/messages";
import { decryptMessage } from "../crypto";
import { registerHandlers } from "../socket/handlers";
import socket from "../socket/socket";
import ConversationList from "../components/ui/conversationlist";
import MessageBubble from "../components/ui/messaguble";
import type { DecryptedMessage } from "../../../shared/src/types/message";

// ── FIX 1: Define stable empty array OUTSIDE the component ──
// If this was inside the component, React creates a new [] reference
// on every render → Zustand thinks state changed → re-renders → infinite loop
const EMPTY_MESSAGES: DecryptedMessage[] = [];

export default function Chat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── FIX 1 applied: use EMPTY_MESSAGES instead of [] ────────
  const messages = useChatStore(
    (s) => s.messages[selectedUserId ?? ""] ?? EMPTY_MESSAGES,
  );

  const { sendMessage, isSending, sendError } = useEncryptedChat();

  // ── FIX 2: Do NOT select functions via useChatStore() selector ──
  // Selecting a function reference this way can trigger re-renders.
  // Use getState() inside handlers instead — it reads store imperatively.
  // (removed: const addOrUpdateConversation = useChatStore(...))

  useEffect(() => {
    socket.connect();
    const cleanup = registerHandlers();
    return () => {
      cleanup();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedUserId) return;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const keyPair = useCryptoStore.getState().keyPair;
        const privateKey = keyPair?.privateKey;
        if (!privateKey) {
          console.error("No private key in memory — cannot decrypt history");
          return;
        }

        const encrypted = await fetchHistory(selectedUserId!);

        const decrypted: DecryptedMessage[] = await Promise.all(
          encrypted.map(async (msg) => {
            const plaintext = await decryptMessage(msg, privateKey);
            return {
              id: msg.id!,
              plaintext,
              senderId: msg.senderId,
              recipientId: msg.recipientId,
              timestamp: msg.createdAt ?? new Date().toISOString(),
            };
          }),
        );

        useChatStore.getState().setHistory(selectedUserId!, decrypted);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [selectedUserId]);

  const handleSelectConversation = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    // ── FIX 2 applied: use getState() instead of selector ──
    useChatStore.getState().addOrUpdateConversation({
      id: userId,
      recipientId: userId,
      recipientUsername: username,
    });
  };

  const handleSend = async () => {
    if (!selectedUserId || !messageInput.trim()) return;

    const text = messageInput;
    setMessageInput("");

    await sendMessage(selectedUserId, text);

    // ── FIX 2 applied here too ──────────────────────────────
    useChatStore.getState().addOrUpdateConversation({
      id: selectedUserId,
      recipientId: selectedUserId,
      recipientUsername: selectedUsername,
      lastMessage: text,
      lastMessageAt: new Date().toISOString(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* ── Left panel: conversation list ── */}
      <div style={{ width: "280px", flexShrink: 0 }}>
        <ConversationList
          onSelect={handleSelectConversation}
          selectedUserId={selectedUserId}
        />
      </div>

      {/* ── Right panel: message thread + input ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedUserId ? (
          <>
            {/* Chat header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#4F46E5",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                {selectedUsername[0]?.toUpperCase()}
              </div>
              {selectedUsername}

              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  background: "#D1FAE5",
                  color: "#065F46",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  fontWeight: 500,
                }}
              >
                End-to-end encrypted
              </span>
            </div>

            {/* Message thread */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 0",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isLoadingHistory ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "13px",
                    padding: "24px",
                  }}
                >
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "13px",
                    padding: "24px",
                  }}
                >
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div
                style={{
                  padding: "6px 16px",
                  color: "red",
                  fontSize: "12px",
                  borderTop: "1px solid #fee2e2",
                  background: "#fef2f2",
                }}
              >
                {sendError}
              </div>
            )}

            {/* Input box */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
              }}
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "24px",
                  fontSize: "14px",
                  outline: "none",
                  background: isSending ? "#f9fafb" : "white",
                }}
              />
              <button
                onClick={handleSend}
                disabled={isSending || !messageInput.trim()}
                style={{
                  padding: "10px 20px",
                  background:
                    isSending || !messageInput.trim() ? "#e5e7eb" : "#4F46E5",
                  color:
                    isSending || !messageInput.trim() ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "24px",
                  fontSize: "14px",
                  cursor:
                    isSending || !messageInput.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 500,
                }}
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "32px" }}>💬</div>
            <div style={{ fontSize: "15px", fontWeight: 500 }}>
              Select a conversation
            </div>
            <div style={{ fontSize: "13px" }}>
              or search for a user to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
