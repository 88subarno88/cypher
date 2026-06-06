import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/chatStore";
import { useCryptoStore } from "../store/cryptoStore";
import { useMyStore } from "../store/authStore";
import { useEncryptedChat } from "../hooks/useEncryptedchat";
import { fetchHistory, searchUsers } from "../api/messages";
import { decryptMessage } from "../crypto";
import { registerHandlers } from "../socket/handlers";
import socket from "../socket/socket";
import { getAvatar, saveAvatar, fileToDataUrl } from "../utils/avatarStore";
import type { DecryptedMessage } from "../../../shared/src/types/message";

const EMPTY_MESSAGES: DecryptedMessage[] = [];

// ── Avatar component with profile pic support ──────────────
function Avatar({
  userId,
  username,
  size = 44,
}: {
  userId: string;
  username: string;
  size?: number;
}) {
  const pic = getAvatar(userId);
  const colours = [
    "#6366F1",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#10B981",
    "#06B6D4",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++)
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const colour = colours[Math.abs(hash) % colours.length];

  if (pic) {
    return (
      <img
        src={pic}
        alt={username}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colour,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}

export default function Chat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [messageInput, setMessageInput] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { id: string; username: string }[]
  >([]);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore(
    (s) => s.messages[selectedUserId ?? ""] ?? EMPTY_MESSAGES,
  );
  const conversations = useChatStore((s) => s.conversations);
  const { sendMessage, isSending } = useEncryptedChat();
  const currentUser = useMyStore((s) => s.user);

  // Connect once, keep the socket alive (no disconnect on unmount)
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const cleanup = registerHandlers();
    return () => {
      cleanup();
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load history when conversation changes
  useEffect(() => {
    if (!selectedUserId) return;
    async function load() {
      setIsLoadingHistory(true);
      try {
        const privateKey = useCryptoStore.getState().keyPair?.privateKey;
        if (!privateKey) {
          console.error(
            "HISTORY: No private key in memory — log in again to decrypt",
          );
          return;
        }

        const encrypted = await fetchHistory(selectedUserId!);
        console.log("HISTORY: fetched", encrypted.length, "encrypted messages");

        // ── FIX: decrypt each message individually ─────────────
        // Promise.all fails the WHOLE batch if ONE message can't decrypt.
        // A message encrypted with an old/rotated key throws OperationError.
        // Loop instead and skip the bad ones so the good messages still show.
        const decrypted: DecryptedMessage[] = [];
        for (const msg of encrypted) {
          try {
            const plaintext = await decryptMessage(msg, privateKey);
            decrypted.push({
              id: msg.id!,
              plaintext,
              senderId: msg.senderId,
              recipientId: msg.recipientId,
              timestamp: msg.createdAt ?? new Date().toISOString(),
            });
          } catch {
            // This message was encrypted with a key we no longer have
            // (e.g. account was re-registered). Skip it instead of crashing.
            console.warn("Skipping undecryptable message:", msg.id);
          }
        }

        console.log("HISTORY: decrypted", decrypted.length, "messages");
        useChatStore.getState().setHistory(selectedUserId!, decrypted);
      } catch (err) {
        console.error("HISTORY load failed:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    load();
  }, [selectedUserId]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchResults(await searchUsers(q));
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelect = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setSearchQuery("");
    setSearchResults([]);
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
    useChatStore.getState().addOrUpdateConversation({
      id: selectedUserId,
      recipientId: selectedUserId,
      recipientUsername: selectedUsername,
      lastMessage: text,
      lastMessageAt: new Date().toISOString(),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const dataUrl = await fileToDataUrl(file);
    saveAvatar(currentUser.id, dataUrl);
    setAvatarVersion((v) => v + 1);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#fff",
      }}
    >
      {/* ══ LEFT SIDEBAR ══ */}
      <div
        style={{
          width: "340px",
          flexShrink: 0,
          borderRight: "1px solid #e9edef",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        {/* Profile header */}
        <div
          style={{
            padding: "12px 16px",
            background: "#f0f2f5",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid #e9edef",
          }}
        >
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar
              key={avatarVersion}
              userId={currentUser?.id ?? ""}
              username={currentUser?.username ?? "?"}
              size={40}
            />
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                background: "#6366F1",
                borderRadius: "50%",
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                border: "2px solid #f0f2f5",
              }}
            >
              📷
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: "none" }}
          />
          <div style={{ flex: 1, fontWeight: 600, fontSize: "15px" }}>
            {currentUser?.username}
          </div>
          <button
            onClick={() => navigate("/settings")}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#54656f",
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 12px", background: "#fff" }}>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search or start new chat"
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "#f0f2f5",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {searchQuery.trim() &&
            searchResults.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelect(u.id, u.username)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderBottom: "1px solid #f5f6f6",
                }}
              >
                <Avatar userId={u.id} username={u.username} />
                <span style={{ fontSize: "15px", fontWeight: 500 }}>
                  {u.username}
                </span>
              </div>
            ))}

          {!searchQuery.trim() && conversations.length === 0 && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#8696a0",
                fontSize: "14px",
              }}
            >
              No chats yet.
              <br />
              Search to start a conversation.
            </div>
          )}

          {!searchQuery.trim() &&
            conversations.map((c) => (
              <div
                key={c.recipientId}
                onClick={() => handleSelect(c.recipientId, c.recipientUsername)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background:
                    selectedUserId === c.recipientId
                      ? "#f0f2f5"
                      : "transparent",
                  borderBottom: "1px solid #f5f6f6",
                }}
              >
                <Avatar
                  userId={c.recipientId}
                  username={c.recipientUsername}
                  size={48}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "16px" }}>
                    {c.recipientUsername}
                  </div>
                  {c.lastMessage && (
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#667781",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.lastMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#efeae2",
        }}
      >
        {selectedUserId ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: "10px 16px",
                background: "#f0f2f5",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #e9edef",
              }}
            >
              <Avatar
                userId={selectedUserId}
                username={selectedUsername}
                size={40}
              />
              <div style={{ flex: 1, fontWeight: 600, fontSize: "16px" }}>
                {selectedUsername}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontWeight: 500,
                }}
              >
                🔒 Encrypted
              </span>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 8%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isLoadingHistory ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8696a0",
                    fontSize: "13px",
                    padding: "24px",
                  }}
                >
                  Loading...
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8696a0",
                    fontSize: "13px",
                    padding: "24px",
                  }}
                >
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;
                  const time = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "65%",
                          padding: "6px 10px 8px",
                          borderRadius: "8px",
                          background: isMine ? "#d9fdd3" : "#fff",
                          boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            wordBreak: "break-word",
                            color: "#111b21",
                          }}
                        >
                          {msg.plaintext}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#667781",
                            textAlign: "right",
                            marginTop: "2px",
                          }}
                        >
                          {time}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: "10px 16px",
                background: "#f0f2f5",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message"
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "24px",
                  fontSize: "15px",
                  outline: "none",
                  background: "#fff",
                }}
              />
              <button
                onClick={handleSend}
                disabled={isSending || !messageInput.trim()}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "none",
                  background: messageInput.trim() ? "#6366F1" : "#e5e7eb",
                  color: "white",
                  fontSize: "18px",
                  cursor: messageInput.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ➤
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
              color: "#8696a0",
              gap: "12px",
              background: "#f0f2f5",
            }}
          >
            <div style={{ fontSize: "64px" }}>🔐</div>
            <div
              style={{ fontSize: "22px", fontWeight: 300, color: "#41525d" }}
            >
              Cipher Messenger
            </div>
            <div style={{ fontSize: "14px" }}>
              Select a chat or search for a user to begin
            </div>
            <div style={{ fontSize: "12px", marginTop: "8px" }}>
              🔒 Your messages are end-to-end encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
