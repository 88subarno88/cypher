import express from "express";
import helmet from "helmet";
import cors from "cors";

import authRouter from "./routes/auth";
import keysRouter from "./routes/keys";
import usersRouter from "./routes/users";
import messagesRouter from "./routes/messages";
import filesRouter from "./routes/files"; 
import { loginRateLimit } from "./middleware/rateLimit";

const app = express();

//Security headers with helmet
// Added contentSecurityPolicy to block XSS attacks.
// CSP prevents injected scripts from running critical since
// crypto keys live in memory and XSS could exfiltrate them.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"], // blob: lets decrypted images render
        mediaSrc: ["'self'", "blob:"], // blob: lets decrypted video play
        connectSrc: ["'self'", "ws://localhost:3000", "http://localhost:3000"],
      },
    },
  }),
);

//Only exact CLIENT_ORIGIN is allowed. No wildcards.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Parse JSON request bodies
app.use(express.json());

// loginRateLimit applied to POST /auth/login only.
// Other auth routes (register, refresh, logout) are not rate limited here.
app.use("/auth/login", loginRateLimit);
app.use("/auth", authRouter);
app.use("/keys", keysRouter);
app.use("/users", usersRouter);
app.use("/messages", messagesRouter);
app.use("/files", filesRouter); // ← NEW

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
