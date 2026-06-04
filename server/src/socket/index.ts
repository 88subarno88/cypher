import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import type { TokenPayload } from "@cipher/shared";
import { registerChatHandlers } from "./chathandlers";
import { registerPresenceHandlers } from "./presenceHandlers";
import {logger} from "../lib/logger";

declare module "socket.io" {
  interface SocketData {
    user: TokenPayload;
  }
}

export function setupSocket(io: Server): void {
  //middleware that checks the authencity of the user
  io.use((socket, next) => {
    const token = socket.handshake.auth.token; //This is the token sent by socket.ts on the client side
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!,
      ) as TokenPayload;
      socket.data.user = decoded; //now every event handler can read socket.data.user.userId
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });
  //handle new connection
  io.on("connection", (socket: Socket) => {
    logger.info("Socket connected", { userId: socket.data.user.userId });
    socket.join(socket.data.user.userId);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    socket.on("disconnect", () => {
      logger.info("Socket disconnected", { userId: socket.data.user.userId });
    });
  });
}
