import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:6002/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  DEFAULT_API_URL;

// Defense in depth: a release build talking to a plaintext http:// API would
// send every request (and any future auth token) unencrypted. Local dev
// legitimately uses http://localhost, so this only asserts in release builds.
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(
    `Refusing to run a release build with a non-HTTPS API_BASE_URL: ${API_BASE_URL}`,
  );
}

export const CAMPUS_ID =
  process.env.EXPO_PUBLIC_CAMPUS_ID ?? 'iitj';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new ApiError(
      `Request failed: ${response.status}`,
      response.status,
      data,
    );
  }

  return data;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export interface SyncManifest {
  campusId: string;
  versions: Record<string, number>;
  updatedAt: string;
}

export function getManifest(campusId = CAMPUS_ID) {
  return apiGet<SyncManifest>('/sync/manifest', { campus: campusId });
}

export function getModule<T>(module: string, campusId = CAMPUS_ID) {
  return apiGet<T>(`/${module}`, { campus: campusId });
}

export function submitSuggestion(message: string) {
  return apiPost<{ success: boolean; id?: string }>('/suggestions', { message });
}
