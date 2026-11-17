import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, getToken } from '../api.js';
import AuthPage from '../components/AuthPage.jsx';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

vi.mock('../auth.jsx', () => ({
  useAuth: () => ({ login }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAuth(route = '/login') {
  render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProbe />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function submitForm() {
  return userEvent.click(within(document.querySelector('form')).getByRole('button', { name: /log in|create account/i }));
}

beforeEach(() => {
  localStorage.clear();
  api.mockReset();
});

describe('AuthPage', () => {
  it('always shows the Admin login and User login shortcuts on the login page', () => {
    renderAuth();
    expect(screen.getByRole('button', { name: 'Admin login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'User login' })).toBeInTheDocument();
    expect(screen.getByText('Demo account shortcuts')).toBeInTheDocument();
  });

  it('fills the demo credentials when a shortcut is clicked', async () => {
    renderAuth();
    await userEvent.click(screen.getByRole('button', { name: 'Admin login' }));
    expect(screen.getByLabelText('Email')).toHaveValue('admin@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('AdminPass123');

    await userEvent.click(screen.getByRole('button', { name: 'User login' }));
    expect(screen.getByLabelText('Email')).toHaveValue('demo1@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('Password123');
  });

  it('submits the login form, stores the token, and navigates to the saved route', async () => {
    api.mockResolvedValue({ token: 'jwt-token', user: { _id: 'u1', role: 'user' } });
    renderAuth({ pathname: '/login', state: { from: { pathname: '/posts' } } });

    await userEvent.click(screen.getByRole('button', { name: 'User login' }));
    await submitForm();

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: { email: 'demo1@example.com', password: 'Password123' },
      }),
    );
    expect(getToken()).toBe('jwt-token');
    expect(login).toHaveBeenCalledWith({ _id: 'u1', role: 'user' });
    expect(screen.getByTestId('location')).toHaveTextContent('/posts');
  });

  it('falls back to /notes after a successful login', async () => {
    api.mockResolvedValue({ token: 'jwt', user: { _id: 'a1', role: 'admin' } });
    renderAuth();
    await userEvent.click(screen.getByRole('button', { name: 'Admin login' }));
    await submitForm();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/notes'));
  });

  it('submits register fields with interests split into an array', async () => {
    api.mockResolvedValue({ token: 'jwt', user: { _id: 'u2', role: 'user' } });
    renderAuth('/register');

    expect(screen.queryByRole('button', { name: 'Admin login' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'New User');
    await userEvent.type(screen.getByLabelText('Interests (comma separated)'), 'tech, music, ');
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await submitForm();

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        body: {
          name: 'New User',
          email: 'new@example.com',
          password: 'Password123',
          interests: ['tech', 'music'],
        },
      }),
    );
  });

  it('switches between login and register with the tabs', async () => {
    renderAuth();
    await userEvent.click(screen.getByRole('tab', { name: 'Register' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('shows API errors and does not store a token on failure', async () => {
    const error = Object.assign(new Error('Request failed'), {
      message: 'Invalid email or password',
    });
    api.mockRejectedValue(error);
    renderAuth();
    await userEvent.click(screen.getByRole('button', { name: 'User login' }));
    await submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(getToken()).toBeNull();
  });
});
