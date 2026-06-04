import { useState } from "react";
import { searchUsers } from "../../api/messages";
import { useChatStore } from "../../store/chatStore";
import type { Conversation } from "../../store/chatStore";

interface ConversationListProps {
  onSelect: (userId: string, username: string) => void;
  selectedUserId: string | null;
}

export default function ConversationList({
  onSelect,
  selectedUserId,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    { id: string; username: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Read conversations from global store
  const conversations = useChatStore((s) => s.conversations);

  // Called on every keystroke in the search box
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Empty query — clear results and show conversations list
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Called when user clicks a search result or a conversation
  const handleSelect = (userId: string, username: string) => {
    onSelect(userId, username);
    // Clear search after selecting
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: "1px solid #e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e5e7eb",
          fontWeight: 600,
          fontSize: "16px",
        }}
      >
        Chats
      </div>

      {/* Search box */}
      <div style={{ padding: "12px 16px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search users..."
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "13px",
            outline: "none",
          }}
        />
      </div>

      {/* Loading indicator while searching */}
      {isSearching && (
        <div
          style={{ padding: "8px 16px", fontSize: "12px", color: "#9ca3af" }}
        >
          Searching...
        </div>
      )}

      {/* Search results — shown only while searchQuery is not empty */}
      {searchQuery.trim() && searchResults.length > 0 && (
        <div>
          <div
            style={{
              padding: "4px 16px",
              fontSize: "11px",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Results
          </div>
          {searchResults.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelect(user.id, user.username)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                background:
                  selectedUserId === user.id ? "#EEF2FF" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background =
                  selectedUserId === user.id ? "#EEF2FF" : "#f9fafb")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background =
                  selectedUserId === user.id ? "#EEF2FF" : "transparent")
              }
            >
              {/* Avatar circle with first letter */}
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
                  fontSize: "14px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {user.username}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
        <div
          style={{ padding: "8px 16px", fontSize: "13px", color: "#9ca3af" }}
        >
          No users found
        </div>
      )}

      {/* Existing conversations — shown when not searching */}
      {!searchQuery.trim() && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "13px",
              }}
            >
              No conversations yet.
              <br />
              Search for a user to start chatting.
            </div>
          ) : (
            conversations.map((conv: Conversation) => (
              <div
                key={conv.recipientId}
                onClick={() =>
                  handleSelect(conv.recipientId, conv.recipientUsername)
                }
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background:
                    selectedUserId === conv.recipientId
                      ? "#EEF2FF"
                      : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderBottom: "1px solid #f3f4f6",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    selectedUserId === conv.recipientId ? "#EEF2FF" : "#f9fafb")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    selectedUserId === conv.recipientId
                      ? "#EEF2FF"
                      : "transparent")
                }
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "#4F46E5",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {conv.recipientUsername[0].toUpperCase()}
                </div>

                {/* Name and last message preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "14px" }}>
                    {conv.recipientUsername}
                  </div>
                  {conv.lastMessage && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {conv.lastMessage}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
