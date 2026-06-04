import type { DecryptedMessage } from "../../../../shared/src/types/message";
import { useMyStore } from "../../store/authStore";

interface MessageBubbleProps {
  message: DecryptedMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  // Check if this message was sent by the logged-in user
  const currentUserId = useMyStore((s) => s.user?.id);
  const isMine = message.senderId === currentUserId;

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: "8px",
        padding: "0 8px",
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          // isMine = right bubble with flat bottom-right corner
          // not mine = left bubble with flat bottom-left corner
          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isMine ? "#4F46E5" : "#F3F4F6",
          color: isMine ? "white" : "black",
        }}
      >
        {/* The actual decrypted message text */}
        <p style={{ margin: 0, wordBreak: "break-word", fontSize: "14px" }}>
          {message.plaintext}
        </p>

        {/* Timestamp below the message */}
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "11px",
            opacity: 0.7,
            textAlign: "right",
          }}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
