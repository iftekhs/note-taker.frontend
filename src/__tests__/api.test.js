import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearToken, errorMessage, getToken, setToken } from '../api.js';

const TOKEN_KEY = 'note_taker_token';

function mockFetch({ status = 200, body, text = '' } = {}) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(text || JSON.stringify(body ?? null)),
  };
  globalThis.fetch = vi.fn().mockResolvedValue(response);
  return response;
}

describe('token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets, reads, and clears the bearer token', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('errorMessage', () => {
  it('returns a default for missing errors', () => {
    expect(errorMessage(null)).toBe('Something went wrong');
  });

  it('returns the message for normal errors', () => {
    expect(errorMessage({ message: 'Nope' })).toBe('Nope');
  });

  it('joins zod-style detail messages', () => {
    expect(
      errorMessage({
        message: 'Validation failed',
        details: [{ path: 'email', message: 'invalid email' }, 'password required'],
      }),
    ).toBe('Validation failed: invalid email, password required');
  });

  it('handles empty detail arrays', () => {
    expect(errorMessage({ message: 'Validation failed', details: [] })).toBe('Validation failed');
  });
});

describe('api()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a JSON request with the bearer token and filtered query params', async () => {
    setToken('token-123');
    mockFetch({ body: { data: [] } });

    const result = await api('/notes', {
      method: 'POST',
      body: { title: 'Hi' },
      params: { page: 2, limit: 10, owner: '', filter: undefined, missing: null },
    });

    expect(result).toEqual({ data: [] });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/notes?page=2&limit=10', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({ title: 'Hi' }),
    });
  });

  it('omits body headers and auth when not needed', async () => {
    mockFetch({ body: { status: 'ok' } });
    await api('/health');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/health', {
      method: 'GET',
      headers: {},
      body: undefined,
    });
  });

  it('supports plain-text successful responses', async () => {
    mockFetch({ text: 'plain text' });
    expect(await api('/text')).toBe('plain text');
  });

  it('throws a structured error from an API error response', async () => {
    mockFetch({
      status: 400,
      body: { error: { message: 'Validation failed', details: [{ message: 'bad title' }] } },
    });

    await expect(api('/notes', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Validation failed',
      status: 400,
      details: [{ message: 'bad title' }],
    });
  });

  it('dispatches auth:expired for 401 responses on protected routes', async () => {
    setToken('expired');
    mockFetch({ status: 401, body: { error: { message: 'Unauthorized' } } });
    const onExpired = vi.fn();
    window.addEventListener('auth:expired', onExpired);

    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:expired', onExpired);
  });

  it('does not dispatch auth:expired for login failures', async () => {
    setToken('expired');
    mockFetch({ status: 401, body: { error: { message: 'Invalid email or password' } } });
    const onExpired = vi.fn();
    window.addEventListener('auth:expired', onExpired);

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 401,
    });
    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener('auth:expired', onExpired);
  });
});
