import { useState, useEffect } from "react";
import socket from "../socket/socket";

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
   useEffect(() => {
    socket.on("user:online", (userId: string) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on("user:offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });
  return () => {
    socket.off("user:online");
    socket.off("user:offline");
  };
}, []);
  const isOnline= (userId: string)=>{
    return onlineUsers.has(userId);
  };
  return { onlineUsers, isOnline };

}



