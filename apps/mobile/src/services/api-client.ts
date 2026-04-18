import axios, { AxiosError } from "axios";
import { appConfig } from "./config";
import { useAppStore } from "../store";

type RetryableRequest = {
  _retry?: boolean;
  headers?: Record<string, string>;
};

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15_000
});

apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    if (!request || request._retry || status !== 401) {
      throw error;
    }

    request._retry = true;
    const refreshToken = useAppStore.getState().refreshToken;
    if (!refreshToken) {
      useAppStore.getState().clearAuth();
      throw error;
    }

    try {
      const refreshResponse = await axios.post(`${appConfig.apiBaseUrl}/auth/refresh`, { refreshToken });
      const payload = refreshResponse.data?.data;
      if (!payload?.accessToken) {
        throw error;
      }

      useAppStore.getState().setAuth({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user,
        driverProfile: payload.driverProfile
      });

      request.headers = request.headers ?? {};
      request.headers.Authorization = `Bearer ${payload.accessToken}`;
      return apiClient(request);
    } catch {
      useAppStore.getState().clearAuth();
      throw error;
    }
  }
);

