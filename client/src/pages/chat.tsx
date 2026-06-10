import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/chatStore";
import { useCryptoStore } from "../store/cryptoStore";
import { useMyStore } from "../store/authStore";
import { useEncryptedChat } from "../hooks/useEncryptedchat";
import { fetchHistory, searchUsers, fetchConversations } from "../api/messages";
import { decryptMessage } from "../crypto";
import { decryptFile } from "../crypto/fileEncryption";
import { downloadEncryptedFile } from "../api/files";
import { getLocalFile } from "../utils/localFileCache";
import { registerHandlers } from "../socket/handlers";
import socket from "../socket/socket";
import { getAvatar, saveAvatar, fileToDataUrl } from "../utils/avatarStore";
import type { DecryptedMessage } from "../../../shared/src/types/message";

const EMPTY_MESSAGES: DecryptedMessage[] = [];

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

// ── Renders a message body: text, image, video, or file link ──
function MessageContent({ msg }: { msg: DecryptedMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plain text message
  if (msg.messageType !== "file") {
    return (
      <div
        style={{ fontSize: "14px", wordBreak: "break-word", color: "#111b21" }}
      >
        {msg.plaintext}
      </div>
    );
  }

  // ── SENDER's own copy: if a local blob is cached for this fileId,
  //    show it directly (no download, no decrypt). The recipient has
  //    no cache entry, so they fall through to download + decrypt. ──
  const localCopy =
    (msg as any).localUrl ||
    (msg.fileId ? getLocalFile(msg.fileId) : undefined);
  if (localCopy) {
    const isImg = !!msg.mimeType?.startsWith("image/");
    const isVid = !!msg.mimeType?.startsWith("video/");
    if (isImg) {
      return (
        <img
          src={localCopy}
          alt={msg.fileName}
          style={{ maxWidth: "240px", borderRadius: "6px", display: "block" }}
        />
      );
    }
    if (isVid) {
      return (
        <video
          src={localCopy}
          controls
          style={{ maxWidth: "260px", borderRadius: "6px", display: "block" }}
        />
      );
    }
    return (
      <a
        href={localCopy}
        download={msg.fileName}
        style={{ color: "#2563eb", fontSize: "14px" }}
      >
        ⬇ {msg.fileName || "Download file"}
      </a>
    );
  }

  async function loadFile() {
    if (!msg.fileId || !msg.encryptedKey || !msg.iv) {
      setError("This file is missing its decryption keys.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const privateKey = useCryptoStore.getState().keyPair?.privateKey;
      if (!privateKey) {
        setError("Your key isn't loaded. Log in again to view files.");
        return;
      }
      let encrypted: ArrayBuffer;
      try {
        encrypted = await downloadEncryptedFile(msg.fileId);
      } catch {
        setError("Couldn't download the file. It may have been removed.");
        return;
      }
      let decrypted: ArrayBuffer;
      try {
        decrypted = await decryptFile(
          encrypted,
          msg.encryptedKey,
          msg.iv,
          privateKey,
        );
      } catch (err) {
        console.error("DECRYPT FILE ERROR:", err);
        setError("Couldn't decrypt this file.");
        return;
      }
      const blob = new Blob([decrypted], {
        type: msg.mimeType || "application/octet-stream",
      });
      setUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("File load failed:", err);
      setError("Something went wrong opening this file.");
    } finally {
      setLoading(false);
    }
  }

  const isImage = !!msg.mimeType?.startsWith("image/");
  const isVideo = !!msg.mimeType?.startsWith("video/");

  if (error) {
    return (
      <div style={{ fontSize: "13px", color: "#b91c1c" }}>
        ⚠️ {error}
        <button
          onClick={() => {
            setError(null);
            loadFile();
          }}
          style={{
            marginLeft: "8px",
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: "13px",
            textDecoration: "underline",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (url) {
    if (isImage) {
      return (
        <img
          src={url}
          alt={msg.fileName}
          style={{ maxWidth: "240px", borderRadius: "6px", display: "block" }}
        />
      );
    }
    if (isVideo) {
      return (
        <video
          src={url}
          controls
          style={{ maxWidth: "260px", borderRadius: "6px", display: "block" }}
        />
      );
    }
    return (
      <a
        href={url}
        download={msg.fileName}
        style={{ color: "#2563eb", fontSize: "14px" }}
      >
        ⬇ {msg.fileName || "Download file"}
      </a>
    );
  }

  return (
    <button
      onClick={loadFile}
      disabled={loading}
      style={{
        background: "none",
        border: "1px dashed #9ca3af",
        borderRadius: "6px",
        padding: "8px 12px",
        cursor: loading ? "wait" : "pointer",
        fontSize: "13px",
        color: "#374151",
      }}
    >
      {loading ? "Decrypting..." : `📎 ${msg.fileName || "file"} — tap to view`}
    </button>
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
  const attachInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore(
    (s) => s.messages[selectedUserId ?? ""] ?? EMPTY_MESSAGES,
  );
  const conversations = useChatStore((s) => s.conversations);
  const { sendMessage, sendFile, isSending, sendError } = useEncryptedChat();
  const currentUser = useMyStore((s) => s.user);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const cleanup = registerHandlers();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    async function loadConversations() {
      try {
        const partners = await fetchConversations();
        partners.forEach((p) => {
          useChatStore.getState().addOrUpdateConversation({
            id: p.id,
            recipientId: p.id,
            recipientUsername: p.username,
          });
        });
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    }
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedUserId) return;
    async function load() {
      setIsLoadingHistory(true);
      try {
        const privateKey = useCryptoStore.getState().keyPair?.privateKey;
        if (!privateKey) {
          console.error("HISTORY: No private key in memory");
          return;
        }
        const encrypted = await fetchHistory(selectedUserId!);
        const decrypted: DecryptedMessage[] = [];
        for (const msg of encrypted) {
          try {
            const isFile = (msg as any).messageType === "file";
            const plaintext = isFile
              ? ""
              : await decryptMessage(msg, privateKey);
            decrypted.push({
              id: msg.id!,
              plaintext,
              senderId: msg.senderId,
              recipientId: msg.recipientId,
              timestamp: msg.createdAt ?? new Date().toISOString(),
              messageType: (msg as any).messageType ?? "text",
              fileId: (msg as any).fileId,
              fileName: (msg as any).fileName,
              mimeType: (msg as any).mimeType,
              encryptedKey: msg.encryptedKey,
              iv: msg.iv,
            });
          } catch {
            console.warn("Skipping undecryptable message:", msg.id);
          }
        }
        const current = useChatStore.getState().messages[selectedUserId!] ?? [];
        const byId = new Map<string, DecryptedMessage>();
        // current first; keep an existing entry that already has a localUrl
        // (the sender's own viewable file copy) instead of overwriting it.
        for (const m of [...current, ...decrypted]) {
          const existing = byId.get(m.id);
          if (existing && (existing as any).localUrl) continue;
          byId.set(m.id, m);
        }
        const merged = Array.from(byId.values()).sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        useChatStore.getState().setHistory(selectedUserId!, merged);
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
    if (userId === currentUser?.id) {
      console.warn("Ignoring self-conversation:", userId);
      return;
    }
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
    if (selectedUserId === currentUser?.id) {
      console.error("Cannot send a message to yourself");
      return;
    }
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

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;
    await sendFile(selectedUserId, file);
    useChatStore.getState().addOrUpdateConversation({
      id: selectedUserId,
      recipientId: selectedUserId,
      recipientUsername: selectedUsername,
      lastMessage: "📎 " + file.name,
      lastMessageAt: new Date().toISOString(),
    });
    e.target.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const dataUrl = await fileToDataUrl(file);
    saveAvatar(currentUser.id, dataUrl);
    setAvatarVersion((v) => v + 1);
  };

  const safeConversations = conversations.filter(
    (c) => c.recipientId !== currentUser?.id,
  );

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

          {!searchQuery.trim() && safeConversations.length === 0 && (
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
            safeConversations.map((c) => (
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
                Chats are Encrypted
              </span>
            </div>

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
                  const myId = currentUser?.id;
                  const isMine = msg.senderId === myId;
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
                        <MessageContent msg={msg} />
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

            {sendError && (
              <div
                style={{
                  padding: "8px 16px",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: "13px",
                  borderTop: "1px solid #fee2e2",
                }}
              >
                ⚠️ {sendError}
              </div>
            )}

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
                ref={attachInputRef}
                type="file"
                onChange={handleAttach}
                style={{ display: "none" }}
              />
              <button
                onClick={() => attachInputRef.current?.click()}
                disabled={isSending}
                title="Attach a file"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "#e5e7eb",
                  color: "#54656f",
                  fontSize: "18px",
                  cursor: isSending ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                📎
              </button>

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
            <div style={{ fontSize: "64px" }}></div>
            <div
              style={{ fontSize: "22px", fontWeight: 300, color: "#41525d" }}
            >
              Cipher Messenger
            </div>
            <div style={{ fontSize: "14px" }}>
              Select a chat or search for a user to begin
            </div>
            <div style={{ fontSize: "12px", marginTop: "8px" }}>
              Your messages are end-to-end encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
