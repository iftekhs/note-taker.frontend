const TOKEN_KEY = 'note_taker_token';
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function errorMessage(error) {
  if (!error) return 'Something went wrong';
  if (Array.isArray(error.details)) {
    const details = error.details
      .map((item) => (typeof item === 'string' ? item : item.message))
      .filter(Boolean)
      .join(', ');
    return details ? `${error.message}: ${details}` : error.message;
  }
  return error.message || 'Request failed';
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const query = params
    ? new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
      ).toString()
    : '';
  const token = getToken();

  const response = await fetch(`${API_BASE}/api${path}${query ? `?${query}` : ''}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload?.error?.details;
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw error;
  }

  return payload;
}
