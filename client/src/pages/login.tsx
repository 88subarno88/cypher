import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyPair } from "../hooks/usekeypair";
import Button from "../components/ui/button";
import Input from "../components/ui/input";
import { login } from "../api/auth"; // calls POST /auth/login
import { useMyStore } from "../store/authStore"; // your store name from Day 3

export default function LoginForm() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { loadKeyPair } = useKeyPair();

  const { setTokens, setUser, logout } = useMyStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authResponse = await login({ username, password });
      console.log("Server login successful");

      setTokens(authResponse.accessToken, authResponse.refreshToken);
      setUser(authResponse.user);

      const success = await loadKeyPair(password);

      if (!success) {
        // Password matched the server but not the stored key
        // This can happen if the user registered on a different device
        // or if IndexedDB was cleared
        setError("Could not restore encryption keys. Try re-registering.");
        // Undo the token storage — do not leave the user half-logged-in
        logout();
        setIsLoading(false);
        return;
      }
      console.log("Private key restored into cryptoStore");

      navigate("/chat");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Server returned 401 — wrong username or password
        setError("Invalid username or password.");
      } else if (err?.response?.status === 429) {
        // Server returned 429 — too many attempts (rate limiter, Day 9)
        setError("Too many login attempts. Please wait a minute.");
      } else {
        setError("Login failed. Please try again.");
      }
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
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
