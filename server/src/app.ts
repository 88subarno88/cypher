import express from "express";
import helmet from "helmet";
import cors from "cors";


import authRouter from "./routes/auth";
import keysRouter from "./routes/keys";

const app = express();

//Add security headers with helmet
// This automatically protects  app from common web vulnerabilities
app.use(helmet());

// Configure CORS
// This ensures ONLY Vite React app is allowed to talk to  backend
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

//Parse JSON request bodies
app.use(express.json());

// Any route in auth.ts starts with /auth (e.g., /auth/login)
app.use("/auth", authRouter);
// Any route in keys.ts starts with /keys (e.g., /keys/:userId)
app.use("/keys", keysRouter);

// Add a basic health check route
// Extremely useful for debugging to ensure your server is alive
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;