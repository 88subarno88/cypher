import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import {logger} from "./lib/logger"; 

// Create an HTTP server that wraps the Express app
const httpServer = http.createServer(app);

// Create the Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Read the port from environment (fallback to 3000)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

//Start listening
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});