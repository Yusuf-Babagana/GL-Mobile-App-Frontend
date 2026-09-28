import * as SecureStore from 'expo-secure-store';
import { debug } from './debug';

const TOKEN_KEY = 'auth_token';
const API_HOST = 'https://glappbackend.pythonanywhere.com/api';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync('accessToken', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync('accessToken');
}

// Mirrors the refresh flow in lib/api.ts so this fetch-based client doesn't
// force a logout the moment the (1-day) access token expires — it shares the
// same refreshToken/accessToken/auth_token SecureStore keys as lib/api.ts.
let isRefreshing = false;
let refreshWaiters: ((token: string | null) => void)[] = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_HOST}/users/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const newAccessToken = data?.access;
    if (!newAccessToken) return null;
    await setToken(newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

function waitForRefresh(): Promise<string | null> {
  return new Promise((resolve) => {
    refreshWaiters.push(resolve);
  });
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const reqId = debug.api.request(path, options.method || 'GET', !!token);

  let response: Response;
  try {
    response = await fetch(`${API_HOST}${path}`, { ...options, headers });
  } catch (fetchErr: any) {
    debug.api.error(reqId, `NETWORK: ${fetchErr.message}`);
    throw fetchErr;
  }

  if (response.status === 401 && !path.includes('/users/token/refresh/') && !path.includes('/users/login/')) {
    debug.api.response(reqId, 401, '(401 — attempting silent refresh)');

    if (!_isRetry) {
      let newToken: string | null;
      if (isRefreshing) {
        newToken = await waitForRefresh();
      } else {
        isRefreshing = true;
        newToken = await refreshAccessToken();
        isRefreshing = false;
        refreshWaiters.forEach((notify) => notify(newToken));
        refreshWaiters = [];
      }

      if (newToken) {
        return apiRequest<T>(path, options, true);
      }
    }

    await clearToken();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const body = await response.text();
    debug.api.response(reqId, response.status, body.slice(0, 200));
    throw new Error(body || `Request failed (${response.status})`);
  }

  const json = await response.json();
  debug.api.response(reqId, response.status, json);
  return json;
}
