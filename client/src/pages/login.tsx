import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyPair } from "../hooks/usekeypair";
import Button from "../components/ui/button";
import Input from "../components/ui/input";

export default function LoginForm() {
  // ── STATE ──
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  //hooks
  const navigate = useNavigate();
  const { loadKeyPair } = useKeyPair();

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent page refresh
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    // Reset states for a new attempt
    setIsLoading(true);
    setError(null);

    try {
      //  Attempt to load the key pair from IndexedDB
      const success = await loadKeyPair(password);

      if (!success) {
        setError("Wrong password or no account found");
        setIsLoading(false);
        return;
      }
      console.log("Private key restored into cryptoStore");

      // Navigate to chat
      navigate("/chat");
    } catch (err) {
      // error
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
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
        {isLoading ? "Running PBKDF2..." : "Login"}
      </button>
    </form>
  );
}
