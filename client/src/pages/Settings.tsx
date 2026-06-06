import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCryptoStore } from "../store/cryptoStore";
import { useMyStore } from "../store/authStore";
import { useKeyPair } from "../hooks/usekeypair";
import { exportPublicKey } from "../crypto";
import apiClient from "../api/client";

export default function Settings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotatePassword, setRotatePassword] = useState("");

  const navigate = useNavigate();
  const { saveKeyPair } = useKeyPair();
  const user = useMyStore((s) => s.user);

  // ── KEY BACKUP EXPORT ──────────────────────────────────
  // Downloads the encrypted private key as a JSON file.
  // The file contains the encrypted blob — NOT the raw private key.
  // Only the user's password can decrypt it.
  const handleExportBackup = async () => {
    setIsExporting(true);
    setMessage(null);
    setError(null);

    try {
      // Read the raw IndexedDB entry using idb
      // We re-use the same database name from constants
      const { openDB } = await import("idb");
      const db = await openDB("cipher-keys", 1);
      const stored = await db.get("keyring", "userKeyData");

      if (!stored) {
        setError("No key backup found. Have you registered on this device?");
        return;
      }

      // Build a safe export object — no raw private key bytes here
      const backup = {
        version: 1,
        username: user?.username,
        exportedAt: new Date().toISOString(),
        // These are encrypted blobs — useless without the password
        encryptedPrivateKey: stored.encryptedPrivateKey,
        iv: stored.iv,
        salt: stored.salt,
        publicKeyB64: stored.publicKeyB64,
      };

      // Trigger a file download
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cipher-key-backup-${user?.username}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage("Key backup downloaded. Store it somewhere safe.");
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── KEY ROTATION ───────────────────────────────────────
  // Generates a brand new RSA key pair, encrypts it with the
  // password, stores in IndexedDB, and updates the server with
  // the new public key so future messages use the new key.
  const handleRotateKeys = async () => {
    if (!rotatePassword) {
      setError("Enter your password to confirm key rotation.");
      return;
    }

    setIsRotating(true);
    setMessage(null);
    setError(null);

    try {
      // Generate new keys and save to IndexedDB (same as registration)
      await saveKeyPair(rotatePassword);

      // Get the new public key to send to the server
      const keyPair = useCryptoStore.getState().keyPair;
      if (!keyPair) throw new Error("Key generation failed");

      const newPublicKeyB64 = await exportPublicKey(keyPair.publicKey);

      // Update the server with the new public key
      await apiClient.put("/keys/rotate", { publicKeyB64: newPublicKeyB64 });

      setMessage(
        "Keys rotated successfully. New messages will use your new key pair.",
      );
      setShowRotateConfirm(false);
      setRotatePassword("");
    } catch (err: any) {
      console.error("Key rotation failed:", err);
      setError("Key rotation failed. Please try again.");
    } finally {
      setIsRotating(false);
    }
  };

  // ── LOGOUT ─────────────────────────────────────────────
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const refreshToken = useMyStore.getState().refreshToken;
      if (refreshToken) {
        // Blocklist the refresh token on the server (Day 9)
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch (err) {
      console.error("LOAD KEY FAILED:", err); // ← add this line
      return false;
    } finally {
      useCryptoStore.getState().clearKeyPair();
      useMyStore.getState().logout();
      navigate("/login");
    }
  };

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "40px auto",
        padding: "0 16px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        <button
          onClick={() => navigate("/chat")}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
          Settings
        </h1>
      </div>

      {/* Account info */}
      <div
        style={{
          padding: "16px",
          background: "#F9FAFB",
          borderRadius: "10px",
          marginBottom: "24px",
          border: "1px solid #E5E7EB",
        }}
      >
        <div
          style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "4px" }}
        >
          Logged in as
        </div>
        <div style={{ fontSize: "16px", fontWeight: 600 }}>
          {user?.username}
        </div>
      </div>

      {/* Status / error messages */}
      {message && (
        <div
          style={{
            padding: "12px",
            background: "#D1FAE5",
            color: "#065F46",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          ✓ {message}
        </div>
      )}
      {error && (
        <div
          style={{
            padding: "12px",
            background: "#FEF2F2",
            color: "#991B1B",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Section: Key backup ───────────────────────── */}
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600 }}>
          🔑 Key Backup
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6B7280" }}>
          Download an encrypted copy of your private key. You will need your
          password to restore it. Store it somewhere safe.
        </p>
        <button
          onClick={handleExportBackup}
          disabled={isExporting}
          style={{
            padding: "10px 20px",
            background: isExporting ? "#E5E7EB" : "#4F46E5",
            color: isExporting ? "#9CA3AF" : "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            cursor: isExporting ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {isExporting ? "Exporting..." : "Download Key Backup"}
        </button>
      </div>

      {/* ── Section: Key rotation ─────────────────────── */}
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600 }}>
          🔄 Rotate Keys
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6B7280" }}>
          Generate a new key pair. Old messages cannot be decrypted with the new
          keys. Only rotate if you believe your keys are compromised.
        </p>

        {!showRotateConfirm ? (
          <button
            onClick={() => setShowRotateConfirm(true)}
            style={{
              padding: "10px 20px",
              background: "white",
              color: "#DC2626",
              border: "1px solid #DC2626",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Rotate Keys
          </button>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#DC2626",
                fontWeight: 500,
              }}
            >
              ⚠️ This cannot be undone. Enter your password to confirm.
            </p>
            <input
              type="password"
              value={rotatePassword}
              onChange={(e) => setRotatePassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                padding: "10px 14px",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleRotateKeys}
                disabled={isRotating}
                style={{
                  padding: "10px 20px",
                  background: isRotating ? "#E5E7EB" : "#DC2626",
                  color: isRotating ? "#9CA3AF" : "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: isRotating ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                {isRotating ? "Rotating..." : "Confirm Rotation"}
              </button>
              <button
                onClick={() => {
                  setShowRotateConfirm(false);
                  setRotatePassword("");
                }}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#374151",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section: Logout ───────────────────────────── */}
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600 }}>
          🚪 Logout
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6B7280" }}>
          Clears your session and encryption keys from this device.
        </p>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          style={{
            padding: "10px 20px",
            background: isLoggingOut ? "#E5E7EB" : "#1F2937",
            color: isLoggingOut ? "#9CA3AF" : "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            cursor: isLoggingOut ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}
