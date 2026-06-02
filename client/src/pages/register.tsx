import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyPair } from "../hooks/usekeypair";
import Button from "../components/ui/button";
import Input from "../components/ui/input";

// ── DAY 6 NEW IMPORTS ─────────────────────────────────────
import { register } from "../api/auth"; // calls POST /auth/register
import { exportPublicKey } from "../crypto"; // gets Base64 public key string
import { useCryptoStore } from "../store/cryptoStore"; // reads keyPair from memory

export default function RegisterForm() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { saveKeyPair } = useKeyPair();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await saveKeyPair(password);
      console.log("Key pair generated and saved to IndexedDB");

      const keyPair = useCryptoStore.getState().keyPair;
      if (!keyPair) throw new Error("Key pair not found after generation");

      const publicKeyB64 = await exportPublicKey(keyPair.publicKey);

      await register({ username, password, publicKeyB64 });
      console.log("Registered on server successfully");

      navigate("/login");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Server returned 409 Conflict — username already taken
        setError("Username already taken. Please choose another.");
      } else if (err?.response?.status === 400) {
        // Server returned 400 — validation failed (e.g. password too short)
        setError(
          "Invalid input. Username must be 3+ chars, password 8+ chars.",
        );
      } else {
        setError("Registration failed. Please try again.");
      }
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: "300px",
        gap: "1rem",
      }}
    >
      {error && (
        <div style={{ color: "red", padding: "10px", border: "1px solid red" }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
