// In-memory access token; refresh via httpOnly cookie through the Next rewrite proxy.
let accessToken: string | null = null;
// One in-flight refresh at a time: rotating concurrently would revoke the token
// the other caller is about to use and sign the user out at random.
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const body = await res.json();
      accessToken = body?.data?.accessToken ?? null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
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
  // Auth routes report their own 401 (bad credentials, expired refresh token).
  // Retrying them would replace the real message with "Session expired".
  const isAuthRoute = path.startsWith("/auth/");
  if (res.status === 401 && !isAuthRoute) {
    const token = await refreshAccessToken();
    if (!token) {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:expired"));
      throw new ApiError("session_expired", "Session expired", 401);
    }
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
