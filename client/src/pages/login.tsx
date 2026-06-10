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

  // Underline-style inputs — editorial, not boxy
  const inputStyle = (name: string) => ({
    width: "100%",
    padding: "13px 2px",
    fontSize: "21px",
    border: "none",
    borderBottom: `2px solid ${focused === name ? "#1a1a1a" : "#d9d4c8"}`,
    outline: "none",
    background: "transparent",
    color: "#1a1a1a",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  });

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "#8a8273",
    marginBottom: "4px",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#faf8f3",
        color: "#1a1a1a",
        display: "flex",
        boxSizing: "border-box",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ════ LEFT COLUMN — form ════ */}
      <div
        style={{
          width: "950px",
          flexShrink: 0,
          padding: "52px 72px 42px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          borderRight: "1px solid #e8e3d8",
        }}
      >
        {/* ── Logo slot: replace this block with your logo ── */}
        <div
          style={{
            width: "120px",
            height: "44px",
            border: "1.5px dashed #c9c2b2",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "#b3ab99",
            fontFamily: "ui-monospace, monospace",
            marginBottom: "90px",
          }}
        >
          YOUR LOGO
        </div>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(46px, 4vw, 58px)",
            fontWeight: 400,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            margin: "0 0 16px",
          }}
        >
          Open your
          <br />
          keyring.
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "#6f6a5e",
            margin: "0 0 56px",
            lineHeight: 1.6,
          }}
        >
          Your password unlocks the private key stored on this device. It never
          travels anywhere.
        </p>

        {error && (
          <div
            style={{
              borderLeft: "3px solid #b3433a",
              background: "#f8ece9",
              color: "#7c2d25",
              padding: "13px 18px",
              fontSize: "17px",
              lineHeight: 1.5,
              marginBottom: "30px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "36px" }}
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
              required
              style={inputStyle("password")}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "18px",
              padding: "18px",
              fontSize: "18px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#faf8f3",
              background: isLoading ? "#8a8273" : "#1a1a1a",
              border: "none",
              cursor: isLoading ? "wait" : "pointer",
              alignSelf: "stretch",
            }}
          >
            {isLoading ? "Unlocking…" : "Sign in →"}
          </button>
        </form>

        <p style={{ fontSize: "17px", color: "#6f6a5e", marginTop: "36px" }}>
          New here?{" "}
          <Link
            to="/register"
            style={{
              color: "#1a1a1a",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Create an account
          </Link>
        </p>

        <div style={{ flex: 1 }} />

        <p
          style={{
            fontSize: "14px",
            letterSpacing: "0.08em",
            color: "#b3ab99",
            fontFamily: "ui-monospace, monospace",
            margin: 0,
          }}
        >
          RSA-OAEP 4096 · AES-256-GCM · zero-knowledge server
        </p>
      </div>

      {/* ════ RIGHT PANEL — the cipher itself, as decoration ════ */}
      <div
        style={{
          flex: 1,
          padding: "52px 83px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <div style={{ maxWidth: "832px" }}>
          <p
            style={{
              fontSize: "14px",
              letterSpacing: "0.16em",
              color: "#8a8273",
              fontFamily: "ui-monospace, monospace",
              margin: "0 0 18px",
            }}
          >
            WHAT YOU WRITE
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "39px",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              margin: "0 0 52px",
              color: "#1a1a1a",
            }}
          >
            "meet me at the old library, six o'clock."
          </p>

          <p
            style={{
              fontSize: "14px",
              letterSpacing: "0.16em",
              color: "#8a8273",
              fontFamily: "ui-monospace, monospace",
              margin: "0 0 18px",
            }}
          >
            WHAT THE SERVER STORES
          </p>
          <p
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: "19px",
              lineHeight: 1.9,
              margin: 0,
              color: "#a39b87",
              wordBreak: "break-all",
            }}
          >
            kQ7vXm2RZpL9aHc4Tf8wJn3BdYs6UeGi1oM5NxA0PrVbCt
            EHqzD2fK8mWy4LgS7jR1nXv9TaQ6ZoB3cPeU5IdMwhF0kN
            r2sGxJ8VbT4mYqA7LpEzCi6WnH3fKdR9oS1uM5XgNjQ0Pe
          </p>

          <div
            style={{
              marginTop: "73px",
              paddingTop: "31px",
              borderTop: "1px solid #e8e3d8",
              display: "flex",
              gap: "62px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "29px",
                  margin: "0 0 6px",
                }}
              >
                600,000
              </p>
              <p
                style={{
                  fontSize: "14px",
                  letterSpacing: "0.08em",
                  color: "#8a8273",
                  margin: 0,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                PBKDF2 ITERATIONS
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "29px",
                  margin: "0 0 6px",
                }}
              >
                4096-bit
              </p>
              <p
                style={{
                  fontSize: "14px",
                  letterSpacing: "0.08em",
                  color: "#8a8273",
                  margin: 0,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                RSA KEY PAIR
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "29px",
                  margin: "0 0 6px",
                }}
              >
                0
              </p>
              <p
                style={{
                  fontSize: "14px",
                  letterSpacing: "0.08em",
                  color: "#8a8273",
                  margin: 0,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                KEYS ON THE SERVER
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
