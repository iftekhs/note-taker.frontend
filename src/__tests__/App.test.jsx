import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, getToken, setToken } from '../api.js';
import { AuthProvider } from '../auth.jsx';
import App from '../App.jsx';

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

const admin = { _id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin' };
const member = { _id: 'u1', name: 'User', email: 'user@example.com', role: 'user' };

let currentUser = admin;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderApp(route = '/notes', user = admin) {
  currentUser = user;
  if (user) setToken('test-token');
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  api.mockReset();
  api.mockImplementation(async (path) => {
    if (path === '/me') return { data: currentUser };
    if (path === '/users/grouped-by-interests') return { data: [], total: 0, totalPages: 0 };
    if (path === '/users') return { data: [], total: 0, totalPages: 0 };
    if (path === '/notes') return { data: [], total: 0, totalPages: 0 };
    if (path === '/posts') return { data: [], total: 0, totalPages: 0 };
    throw new Error(`Unexpected API call: ${path}`);
  });
});

describe('App shell and routing', () => {
  it('shows the flat admin sidebar links in the required order', async () => {
    renderApp('/notes', admin);
    await screen.findByRole('navigation', { name: 'Main' });
    const labels = within(screen.getByRole('navigation', { name: 'Main' }))
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual([
      'All notes',
      'Notes',
      'Posts',
      'Users',
      'Interests',
    ]);
  });

  it('hides admin links from normal users', async () => {
    renderApp('/notes', member);
    await screen.findByRole('navigation', { name: 'Main' });
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(['Notes', 'Posts']);
    expect(nav.queryByRole('link', { name: 'All notes' })).not.toBeInTheDocument();
    expect(nav.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('keeps the sidebar sticky at viewport height on desktop', async () => {
    const { container } = renderApp('/notes', admin);
    await screen.findByRole('navigation', { name: 'Main' });
    const aside = container.querySelector('aside');
    expect(aside.className).toContain('md:sticky');
    expect(aside.className).toContain('md:top-0');
    expect(aside.className).toContain('md:h-svh');
  });

  it('logs out with the destructive button and returns to the login page', async () => {
    renderApp('/notes', admin);
    const logout = await screen.findByRole('button', { name: 'Log out' });
    expect(logout.className).toMatch(/destructive|bg-destructive|text-destructive/);

    await userEvent.click(logout);
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(await screen.findByRole('button', { name: 'Admin login' })).toBeInTheDocument();
  });

  it('redirects / and unknown routes to /notes', async () => {
    const { unmount } = renderApp('/', admin);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/notes'));
    unmount();

    renderApp('/somewhere-else', admin);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/notes'));
  });

  it('redirects /admin to /admin/users for admins and to /notes for users', async () => {
    const { unmount } = renderApp('/admin', admin);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/users'));
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    unmount();

    renderApp('/admin', member);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/notes'));
  });

  it('requires authentication for protected routes', async () => {
    renderApp('/notes', null);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));
    expect(screen.getByRole('button', { name: 'Admin login' })).toBeInTheDocument();
  });
});
