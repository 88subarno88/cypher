// server/src/routes/files.ts
// Stores and serves ENCRYPTED file blobs with proper error handling.

import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB 

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

//  POST /files/upload 
router.post(
  "/upload",
  authMiddleware,
  // Wrap multer so we can translate its errors into clean responses
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        // Most common: file exceeds the 50 MB limit
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large. Max 50 MB." });
        }
        return res.status(400).json({ error: "Upload error: " + err.message });
      } else if (err) {
        logger.error("Unknown upload error", { error: err.message });
        return res.status(500).json({ error: "Upload failed" });
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const fileId = randomUUID();
      const filePath = path.join(UPLOAD_DIR, fileId);
      fs.writeFileSync(filePath, req.file.buffer);

      logger.info("Encrypted file stored", { fileId, size: req.file.size });
      res.status(201).json({ fileId });
    } catch (err: any) {
      logger.error("File write failed", { error: err.message });
      res.status(500).json({ error: "Could not store file" });
    }
  },
);

// GET /files/:fileId
router.get("/:fileId", authMiddleware, (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Reject anything that isn't a clean uuid — blocks path traversal
    if (!/^[a-f0-9-]+$/i.test(fileId)) {
      return res.status(400).json({ error: "Invalid file id" });
    }

    const filePath = path.join(UPLOAD_DIR, fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      logger.error("File stream error", { error: err.message });
      if (!res.headersSent) res.status(500).json({ error: "Read failed" });
    });
    stream.pipe(res);
  } catch (err: any) {
    logger.error("File download failed", { error: err.message });
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;
