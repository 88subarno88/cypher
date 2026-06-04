// Handles user:online and user:offline Socket.io events.
// Stores presence state in Redis with a time-to-live.
// Broadcasts presence changes to all connected users.

import { Server, Socket } from "socket.io";
import redis from "../lib/redis";
import {logger} from "../lib/logger";


export function registerPresenceHandlers(io: Server, socket: Socket): void {
  
  // When user comes online
  socket.on("user:online", async (userId: string) => {
    // Validate userId matches the JWT
    if (userId !== socket.data.user.userId) {
       logger.warn(`User ${socket.data.user.userId} attempted to mark ${userId} as online`);
       return;
    }

    try {
      // Store in Redis with TTL (30 seconds) user:online event runs after 30sec if online then again that run after 30sec else no
      await redis.set(`presence:${userId}`, "online", "EX", 30);
      
      // Broadcast to all connected users
      io.emit("user:online", userId);
      logger.info(`User ${userId} came online`);
    } catch (error) {
       logger.error("Failed to set user presence to online", { error, userId });
    }
  });

  // When user goes offline
  socket.on("user:offline", async (userId: string) => {
    // Validate userId
    if (userId !== socket.data.user.userId) {
       logger.warn(`User ${socket.data.user.userId} attempted to mark ${userId} as offline`);
       return;
    }

    try {
      // Remove from Redis
      await redis.del(`presence:${userId}`);
      
      // Broadcast to all
      io.emit("user:offline", userId);
      logger.info(`User ${userId} went offline manually`);
    } catch (error) {
       logger.error("Failed to set user presence to offline", { error, userId });
    }
  });

  //Auto-offline on disconnect
  socket.on("disconnect", async () => {
    const userId = socket.data.user?.userId;
    
    if (!userId) return; // In case they disconnected before auth finished

    try {
      await redis.del(`presence:${userId}`);
      io.emit("user:offline", userId);
      logger.info(`User ${userId} went offline (disconnected)`);
    } catch (error) {
        logger.error("Failed to handle disconnect presence cleanup", { error, userId });
    }
  });
}