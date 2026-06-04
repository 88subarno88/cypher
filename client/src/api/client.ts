import axios from "axios";
import { useMyStore } from "../store/authStore";
import { refreshToken } from "../api/auth";

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
}); // tells the server every request body is JSON

apiClient.interceptors.request.use((config) => {
  const token = useMyStore.getState().getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config; //// required without this the request never sends
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshToken();
        const currentRefreshToken = useMyStore.getState().refreshToken;
        useMyStore.getState().setTokens(newToken, currentRefreshToken);
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config);
      } catch {
        useMyStore.getState().logout();
        return Promise.reject(error);
      }
    }
  },
);

export default apiClient;
