import axios, { type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types";

// Same-origin: every call goes to this app's /api routes, which forward to
// api.hillview.tv server-side (see lib/upstream.ts). No auth — the kiosk is
// public, as the Angular one was.
const axiosApi = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  validateStatus: () => true,
  timeout: 30000,
});

export const fetchApi = async <T>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  try {
    const res = await axiosApi.request<ApiResponse<T>>(config);
    if (res.data && typeof res.data === "object" && "success" in res.data) {
      return res.data;
    }
    return {
      success: false,
      status: res.status,
      error: "bad_response",
      error_message: "Something went wrong!",
      error_code: res.status,
    };
  } catch {
    return {
      success: false,
      status: 0,
      error: "network_error",
      error_message: "Couldn't reach the asset system. Check the connection.",
      error_code: 0,
    };
  }
};
