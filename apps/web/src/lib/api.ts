// In-memory access token; refresh via httpOnly cookie through the Next rewrite proxy.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

async function refreshSession(): Promise<string | null> {
  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const body = await res.json();
  const token = body?.data?.accessToken ?? null;
  accessToken = token;
  return token;
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      credentials: "include",
    });

  let res = await doFetch(accessToken);
  if (res.status === 401) {
    const token = await refreshSession();
    if (!token) throw new ApiError("session_expired", "Session expired", 401);
    res = await doFetch(token);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error?.code || "request_failed", body?.error?.message || "Request failed", res.status);
  }
  return body?.data as T;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
