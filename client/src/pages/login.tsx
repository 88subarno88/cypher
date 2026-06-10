import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useKeyPair } from "../hooks/usekeypair";
import { login } from "../api/auth"; // calls POST /auth/login
import { useMyStore } from "../store/authStore";

export default function LoginForm() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

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
        setError("Could not restore encryption keys. Try re-registering.");
        logout();
        setIsLoading(false);
        return;
      }
      console.log("Private key restored into cryptoStore");
      navigate("/chat");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err?.response?.status === 429) {
        setError("Too many login attempts. Please wait a minute.");
      } else {
        setError("Login failed. Please try again.");
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (name: string) => ({
    width: "100%",
    padding: "12px 14px",
    fontSize: "15px",
    borderRadius: "10px",
    border: `1.5px solid ${focused === name ? "#6366F1" : "#e2e8f0"}`,
    outline: "none",
    background: "#f8fafc",
    color: "#0f172a",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focused === name ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
    boxSizing: "border-box" as const,
  });

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#475569",
    marginBottom: "6px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #6366F1 100%)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#fff",
          borderRadius: "20px",
          padding: "40px 36px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: 28,
            }}
          >
            🔐
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Welcome back
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}>
            Sign in to your encrypted Cipher account
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              padding: "11px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              marginBottom: "18px",
              border: "1px solid #fee2e2",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label htmlFor="username" style={labelStyle}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused("username")}
              onBlur={() => setFocused(null)}
              placeholder="Enter your username"
              required
              style={inputStyle("username")}
            />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="Enter your password"
              required
              style={inputStyle("password")}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "6px",
              padding: "13px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: isLoading ? "not-allowed" : "pointer",
              background: isLoading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              transition: "opacity 0.15s",
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "22px",
            fontSize: "14px",
            color: "#64748b",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "#6366F1",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create one
          </Link>
        </p>

        <p
          style={{
            textAlign: "center",
            marginTop: "18px",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          End-to-end encrypted. Your keys never leave this device.
        </p>
      </div>
    </div>
  );
}
