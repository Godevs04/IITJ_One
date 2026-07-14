import type { AdminUser, LoginResponse } from './types';

const ACCESS_KEY = 'iitj1_admin_access';
const REFRESH_KEY = 'iitj1_admin_refresh';
const USER_KEY = 'iitj1_admin_user';

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredAdmin(): AdminUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(payload: LoginResponse): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_KEY, payload.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.admin));
}

export function clearSession(): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
