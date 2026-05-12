import type { ApiResponse } from "../types";

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function error(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

export function jsonResponse<T>(
  data: ApiResponse<T>,
  status = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
