const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

function setTokens(access: string | null, refresh: string | null) {
  if (access) localStorage.setItem('access_token', access); else localStorage.removeItem('access_token');
  if (refresh) localStorage.setItem('refresh_token', refresh); else localStorage.removeItem('refresh_token');
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = 60000; // 1 minute buffer - refresh if expiring soon
  return currentTime + bufferTime > expirationTime;
}

async function tryRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const url = `${API_BASE}/auth/refresh?token=${encodeURIComponent(refreshToken)}`;
      const res = await fetch(url, { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      const newAccess = data.access_token;
      if (newAccess) {
        localStorage.setItem('access_token', newAccess);
        console.log('[HTTP] Token refreshed successfully');
        return newAccess;
      }
      return null;
    } catch (e) {
      console.error('[HTTP] Token refresh failed:', e);
      return null;
    } finally {
      isRefreshing = false;
    }
  })();

  return refreshPromise;
}

async function request(path: string, options: RequestInit & { responseType?: 'blob' | 'json' } = {}, retry = true) {
  const url = API_BASE + path;
  const { responseType = 'json', ...requestOptions } = options;

  const headers: Record<string, string> = {
    ...(requestOptions.headers as Record<string, string> || {}),
  };

  // Only set Content-Type to application/json if body is not FormData
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let access = getAccessToken();
  
  // Check if token is expired or expiring soon, and refresh if needed
  if (access && isTokenExpired(access) && retry) {
    console.log('[HTTP] Token expired, attempting refresh...');
    const newAccess = await tryRefresh();
    if (newAccess) {
      access = newAccess;
    } else {
      // Refresh failed, clear tokens
      setTokens(null, null);
    }
  }
  
  if (access) headers['Authorization'] = `Bearer ${access}`;

  const opts: RequestInit = {
    credentials: 'include',
    ...requestOptions,
    headers,
  };

  let res: Response;
  try {
    res = await fetch(url, opts);
  } catch (e: any) {
    // Network-level failure (CORS, connection refused, DNS, etc.)
    throw new Error(e?.message || 'Network error');
  }

  if (res.status === 401 && retry) {
    const newAccess = await tryRefresh();
    if (newAccess) {
      // retry once
      return request(path, { ...requestOptions, responseType }, false);
    }
    // no refresh -> clear tokens
    setTokens(null, null);
    const text = await res.text();
    const content = text ? JSON.parse(text) : null;
    const err = new Error((content && content.detail) || res.statusText || 'Unauthorized');
    throw err;
  }

  if (responseType === 'blob') {
    if (!res.ok) {
      const text = await res.text();
      const message = text || res.statusText || 'Request failed';
      throw new Error(message);
    }
    return await res.blob();
  }

  const text = await res.text();
  let content: any = null;
  if (text) {
    try {
      content = JSON.parse(text);
    } catch (e) {
      // Backend returned non-JSON (or empty) response — return raw text
      content = text;
    }
  }
  if (!res.ok) {
    const message = (content && (content.detail || content.message)) || res.statusText || 'Request failed';
    throw new Error(message);
  }
  return content;
}

export const http = {
  get: async (path: string, options?: { responseType?: 'blob' | 'json' }) => request(path, { method: 'GET', ...options }),
  post: async (path: string, body?: any, options?: { responseType?: 'blob' | 'json' }) => {
    // Don't stringify FormData, pass it as-is
    const processedBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return request(path, { method: 'POST', body: processedBody, ...options });
  },
  put: async (path: string, body?: any) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: async (path: string) => request(path, { method: 'DELETE' }),
  // auth helpers
  setTokens,
  decodeJwtPayload,
};

export default http;
