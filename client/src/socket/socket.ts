import { io, Socket } from "socket.io-client";
import { useMyStore } from "../store/authStore";

const socket: Socket = io("http://localhost:3000", {
  autoConnect: false, //if autoConnect were true, the socket would try to connect before the user is logged in and get rejected immediately
  auth: (cb) => {
    const token = useMyStore.getState().getAccessToken();
    cb({ token }); // The callback form reads the token at the moment of connection which is after login when the token actually exists
  },
});

export default socket;
