import { act, render, screen, waitFor } from '@testing-library/react';
import { Component } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearToken, getToken, setToken } from '../api.js';
import { AuthProvider, PublicOnly, RequireAdmin, RequireAuth, useAuth } from '../auth.jsx';

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

const admin = { _id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin' };
const member = { _id: 'u1', name: 'User', email: 'user@example.com', role: 'user' };

class ErrorBoundary extends Component {
  state = { message: null };

  static getDerivedStateFromError(error) {
    return { message: error.message };
  }

  render() {
    return this.state.message ? <div>{this.state.message}</div> : this.props.children;
  }
}

function Probe() {
  const { user, checking, logout } = useAuth();
  return (
    <div>
      <span data-testid="checking">{String(checking)}</span>
      <span data-testid="user">{user ? user.email : 'anonymous'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithProvider(ui, { route = '/', apiImpl } = {}) {
  if (apiImpl) api.mockImplementation(apiImpl);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  api.mockReset();
});

describe('AuthProvider', () => {
  it('starts unauthenticated without checking the session when there is no token', async () => {
    renderWithProvider(<Probe />);
    expect(screen.getByTestId('checking')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(api).not.toHaveBeenCalled();
  });

  it('loads the current user when a token is present', async () => {
    setToken('valid-token');
    api.mockResolvedValue({ data: admin });

    renderWithProvider(<Probe />);
    expect(screen.getByTestId('checking')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(admin.email));
    expect(screen.getByTestId('checking')).toHaveTextContent('false');
    expect(api).toHaveBeenCalledWith('/me');
  });

  it('clears an invalid token when /me fails', async () => {
    setToken('stale-token');
    api.mockRejectedValue(new Error('Unauthorized'));

    renderWithProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('checking')).toHaveTextContent('false');
  });

  it('logs out by clearing the token and user', async () => {
    setToken('token');
    api.mockResolvedValue({ data: member });
    renderWithProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(member.email));

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
  });

  it('clears the session when the API reports an expired token', async () => {
    setToken('token');
    api.mockResolvedValue({ data: admin });
    renderWithProvider(<Probe />);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(admin.email));

    act(() => {
      window.dispatchEvent(new Event('auth:expired'));
    });
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(getToken()).toBeNull();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    );
    expect(screen.getByText('useAuth must be used inside AuthProvider')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});

describe('route guards', () => {
  it('RequireAuth shows a loading state while the session is checked', () => {
    setToken('token');
    api.mockImplementation(() => new Promise(() => {}));
    renderWithProvider(
      <RequireAuth>
        <div>Secret</div>
      </RequireAuth>,
    );
    expect(screen.getByText('Checking session…')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('RequireAuth redirects anonymous visitors to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/notes']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/notes"
              element={
                <RequireAuth>
                  <div>Private notes</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Private notes')).not.toBeInTheDocument();
  });

  it('RequireAuth renders children for authenticated users', async () => {
    setToken('token');
    api.mockResolvedValue({ data: member });
    render(
      <MemoryRouter initialEntries={['/notes']}>
        <AuthProvider>
          <RequireAuth>
            <div>Private notes</div>
          </RequireAuth>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Private notes')).toBeInTheDocument();
  });

  it('RequireAdmin only allows admins', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <div>Admin only</div>
                </RequireAdmin>
              }
            />
            <Route path="/notes" element={<div>Notes page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Notes page')).toBeInTheDocument();
    unmount();

    setToken('token');
    api.mockResolvedValue({ data: admin });
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AuthProvider>
          <RequireAdmin>
            <div>Admin only</div>
          </RequireAdmin>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Admin only')).toBeInTheDocument();
  });

  it('PublicOnly redirects signed-in users away from auth pages', async () => {
    setToken('token');
    api.mockResolvedValue({ data: member });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <div>Login form</div>
                </PublicOnly>
              }
            />
            <Route path="/notes" element={<div>Notes page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Notes page')).toBeInTheDocument();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
  });

  it('PublicOnly renders auth pages for anonymous visitors', () => {
    renderWithProvider(
      <PublicOnly>
        <div>Login form</div>
      </PublicOnly>,
    );
    expect(screen.getByText('Login form')).toBeInTheDocument();
  });
});
