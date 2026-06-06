// client/src/components/KeyStatusBadge.tsx
// Shows a green lock when the private key is loaded in memory.
// Shows a grey lock when the key is not loaded (after page refresh).

import { useCryptoStore } from "../../store/cryptoStore";

export default function KeyStatusBadge() {
  // Read the keyPair from the in-memory store
  // null = key not loaded, truthy = key is ready
  const keyPair = useCryptoStore((s) => s.keyPair);
  const isLoaded = keyPair !== null;

  return (
    <span
      title={
        isLoaded
          ? "Encryption keys loaded — messages are end-to-end encrypted"
          : "Encryption keys not loaded — enter your password to restore"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "20px",
        background: isLoaded ? "#D1FAE5" : "#F3F4F6",
        color: isLoaded ? "#065F46" : "#9CA3AF",
        border: `1px solid ${isLoaded ? "#6EE7B7" : "#E5E7EB"}`,
        cursor: "default",
        userSelect: "none",
      }}
    >
      {/* Lock icon — green when loaded, grey when not */}
      <span style={{ fontSize: "13px" }}>{isLoaded ? "🔒" : "🔓"}</span>
      {isLoaded ? "E2E Encrypted" : "Keys not loaded"}
    </span>
  );
}
