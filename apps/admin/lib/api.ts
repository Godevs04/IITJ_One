import { apiBaseUrl, campusId } from './tokens';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredAdmin,
  setSession,
} from './auth';
import type { LoginResponse } from './types';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | undefined>;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${apiBaseUrl}/admin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      admin?: LoginResponse['admin'];
    };
    const admin = data.admin ?? getStoredAdmin();
    if (!admin) {
      clearSession();
      return false;
    }
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      admin,
    });
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(
    path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`,
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

async function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && options.auth !== false) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;
    if (ok) {
      res = await rawFetch(path, options);
    }
  }

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/admin/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  setSession(data);
  return data;
}

export function logout(): void {
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export function withCampus(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}campus=${encodeURIComponent(campusId)}`;
}

export { campusId, apiBaseUrl };
