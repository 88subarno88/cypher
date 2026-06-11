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

// ── Shared design tokens — same palette as the login / register pages ──
const ink = "#1a1a1a";
const muted = "#6f6a5e";
const faint = "#8a8273";
const faintest = "#b3ab99";
const line = "#e8e3d8";
const cream = "#faf8f3";
const paper = "#f3efe6";
const cardBg = "#fffdf9";
const serif = "Georgia, 'Times New Roman', serif";
const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
  // Muted, earthy tones that sit well on the cream canvas
  const colours = [
    "#8a8273",
    "#9b8568",
    "#7c6f5a",
    "#a38a6a",
    "#6f6a5e",
    "#9c7a63",
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
        color: cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        fontFamily: serif,
        flexShrink: 0,
      }}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}

// ── Renders a message body: text, image, video, or file link ──
function MessageContent({
  msg,
  isMine,
}: {
  msg: DecryptedMessage;
  isMine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyColor = isMine ? cream : ink;
  const linkColor = isMine ? cream : ink;

  // Plain text message
  if (msg.messageType !== "file") {
    return (
      <div
        style={{
          fontSize: "15px",
          lineHeight: 1.5,
          wordBreak: "break-word",
          color: bodyColor,
        }}
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
        style={{
          color: linkColor,
          fontSize: "14px",
          textDecoration: "underline",
        }}
      >
        ↓ {msg.fileName || "Download file"}
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
      <div style={{ fontSize: "13px", color: isMine ? "#f3b0a8" : "#b3433a" }}>
        ⚠ {error}
        <button
          onClick={() => {
            setError(null);
            loadFile();
          }}
          style={{
            marginLeft: "8px",
            background: "none",
            border: "none",
            color: linkColor,
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
        style={{
          color: linkColor,
          fontSize: "14px",
          textDecoration: "underline",
        }}
      >
        ↓ {msg.fileName || "Download file"}
      </a>
    );
  }

  return (
    <button
      onClick={loadFile}
      disabled={loading}
      style={{
        background: "none",
        border: `1px dashed ${isMine ? "rgba(250,248,243,0.4)" : "#c9c2b2"}`,
        borderRadius: "6px",
        padding: "8px 12px",
        cursor: loading ? "wait" : "pointer",
        fontSize: "13px",
        color: isMine ? cream : muted,
        fontFamily: mono,
      }}
    >
      {loading ? "Decrypting…" : `↟ ${msg.fileName || "file"} — tap to view`}
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
      lastMessage: "↟ " + file.name,
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

  // Small reusable label style — the tracked monospace caption from the auth pages
  const eyebrow = {
    fontSize: "10px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: faint,
    fontFamily: mono,
    fontWeight: 600,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: cream,
        color: ink,
        fontFamily: sans,
      }}
    >
      {/* ══ LEFT SIDEBAR ══ */}
      <div
        style={{
          width: "360px",
          flexShrink: 0,
          borderRight: `1px solid ${line}`,
          display: "flex",
          flexDirection: "column",
          background: cream,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            borderBottom: `1px solid ${line}`,
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
              size={42}
            />
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                background: ink,
                borderRadius: "50%",
                width: 17,
                height: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                color: cream,
                border: `2px solid ${cream}`,
              }}
            >
              ✎
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: "none" }}
          />
          <div
            style={{
              flex: 1,
              fontFamily: serif,
              fontWeight: 400,
              fontSize: "19px",
              letterSpacing: "-0.01em",
            }}
          >
            {currentUser?.username}
          </div>
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            style={{
              background: "none",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
              color: faint,
            }}
          >
            ⚙
          </button>
        </div>

        <div style={{ padding: "14px 16px 10px" }}>
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search or start a new chat"
            style={{
              width: "100%",
              padding: "11px 16px",
              background: paper,
              border: `1px solid ${line}`,
              borderRadius: "10px",
              fontSize: "14px",
              color: ink,
              outline: "none",
              fontFamily: sans,
              boxSizing: "border-box",
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
                  padding: "12px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  borderBottom: `1px solid ${line}`,
                }}
              >
                <Avatar userId={u.id} username={u.username} />
                <span style={{ fontSize: "16px", fontWeight: 500 }}>
                  {u.username}
                </span>
              </div>
            ))}

          {!searchQuery.trim() && safeConversations.length === 0 && (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: faint,
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              No chats yet.
              <br />
              Search above to start a conversation.
            </div>
          )}

          {!searchQuery.trim() &&
            safeConversations.map((c) => (
              <div
                key={c.recipientId}
                onClick={() => handleSelect(c.recipientId, c.recipientUsername)}
                style={{
                  padding: "13px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background:
                    selectedUserId === c.recipientId ? paper : "transparent",
                  borderBottom: `1px solid ${line}`,
                  borderLeft:
                    selectedUserId === c.recipientId
                      ? `2px solid ${ink}`
                      : "2px solid transparent",
                }}
              >
                <Avatar
                  userId={c.recipientId}
                  username={c.recipientUsername}
                  size={48}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: serif,
                      fontWeight: 400,
                      fontSize: "17px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {c.recipientUsername}
                  </div>
                  {c.lastMessage && (
                    <div
                      style={{
                        fontSize: "13px",
                        color: muted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {c.lastMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${line}`,
            ...eyebrow,
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: faintest,
          }}
        >
          RSA-OAEP 4096 · AES-256-GCM
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: paper,
        }}
      >
        {selectedUserId ? (
          <>
            <div
              style={{
                padding: "14px 24px",
                background: cream,
                display: "flex",
                alignItems: "center",
                gap: "14px",
                borderBottom: `1px solid ${line}`,
              }}
            >
              <Avatar
                userId={selectedUserId}
                username={selectedUsername}
                size={42}
              />
              <div
                style={{
                  flex: 1,
                  fontFamily: serif,
                  fontWeight: 400,
                  fontSize: "20px",
                  letterSpacing: "-0.01em",
                }}
              >
                {selectedUsername}
              </div>
              <span
                style={{
                  ...eyebrow,
                  fontSize: "10px",
                  padding: "5px 11px",
                  border: `1px solid ${line}`,
                  borderRadius: "4px",
                  color: faint,
                }}
              >
                End-to-End Encrypted
              </span>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "28px 10%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isLoadingHistory ? (
                <div
                  style={{
                    textAlign: "center",
                    color: faint,
                    fontSize: "13px",
                    fontFamily: mono,
                    letterSpacing: "0.1em",
                    padding: "24px",
                  }}
                >
                  LOADING…
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: faint,
                    fontSize: "14px",
                    padding: "24px",
                  }}
                >
                  No messages yet. Say hello.
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
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "62%",
                          padding: "9px 13px 7px",
                          borderRadius: isMine
                            ? "14px 14px 4px 14px"
                            : "14px 14px 14px 4px",
                          background: isMine ? ink : cardBg,
                          border: isMine ? "none" : `1px solid ${line}`,
                          color: isMine ? cream : ink,
                        }}
                      >
                        <MessageContent msg={msg} isMine={isMine} />
                        <div
                          style={{
                            fontSize: "10px",
                            fontFamily: mono,
                            letterSpacing: "0.05em",
                            color: isMine ? "rgba(250,248,243,0.45)" : faintest,
                            textAlign: "right",
                            marginTop: "4px",
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
                  padding: "10px 24px",
                  background: "#f8ece9",
                  color: "#7c2d25",
                  fontSize: "13px",
                  borderTop: "1px solid #f0d8d2",
                  borderLeft: "3px solid #b3433a",
                }}
              >
                ⚠ {sendError}
              </div>
            )}

            <div
              style={{
                padding: "14px 24px",
                background: cream,
                display: "flex",
                gap: "12px",
                alignItems: "center",
                borderTop: `1px solid ${line}`,
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
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  border: `1px solid ${line}`,
                  background: paper,
                  color: muted,
                  fontSize: "17px",
                  cursor: isSending ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                ↟
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
                  padding: "12px 18px",
                  border: `1px solid ${line}`,
                  borderRadius: "24px",
                  fontSize: "15px",
                  color: ink,
                  outline: "none",
                  background: cardBg,
                  fontFamily: sans,
                }}
              />

              <button
                onClick={handleSend}
                disabled={isSending || !messageInput.trim()}
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  border: "none",
                  background: messageInput.trim() ? ink : line,
                  color: messageInput.trim() ? cream : faintest,
                  fontSize: "18px",
                  cursor: messageInput.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                →
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
              textAlign: "center",
              background: paper,
              padding: "40px",
            }}
          >
            <p
              style={{
                ...eyebrow,
                fontSize: "11px",
                margin: "0 0 18px",
              }}
            >
              End-to-End Encrypted Messenger
            </p>
            <div
              style={{
                fontFamily: serif,
                fontSize: "52px",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: ink,
                margin: "0 0 14px",
              }}
            >
              Cipher
            </div>
            <div
              style={{
                fontSize: "15px",
                color: muted,
                lineHeight: 1.6,
                maxWidth: "32ch",
              }}
            >
              Select a chat or search for someone to begin. Every message is
              sealed on your device before it leaves.
            </div>
            <p
              style={{
                ...eyebrow,
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: faintest,
                marginTop: "44px",
              }}
            >
              RSA-OAEP 4096 · AES-256-GCM · zero-knowledge server
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
