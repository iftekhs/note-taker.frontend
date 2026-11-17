import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage, setToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import FormError from './FormError.jsx';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.jsx';

const DEMO_CREDENTIALS = {
  admin: { email: 'admin@example.com', password: 'AdminPass123' },
  user: { email: 'demo1@example.com', password: 'Password123' },
};

export default function AuthPage({ mode }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    interests: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function switchMode(nextMode) {
    navigate(nextMode === 'login' ? '/login' : '/register');
  }

  function fillCredentials(credentials) {
    setForm((current) => ({ ...current, ...credentials }));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const body =
        mode === 'register'
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
              interests: form.interests
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            }
          : { email: form.email, password: form.password };

      const result = await api(`/auth/${mode}`, { method: 'POST', body });
      setToken(result.token);
      login(result.user);
      navigate(location.state?.from?.pathname || '/notes', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Note Taker</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to manage your notes.' : 'Create an account to get started.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={busy}>Log in</TabsTrigger>
              <TabsTrigger value="register" disabled={busy}>Register</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} aria-busy={busy} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={update('name')} disabled={busy} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interests">Interests (comma separated)</Label>
                  <Input
                    id="interests"
                    value={form.interests}
                    onChange={update('interests')}
                    placeholder="tech, music, travel"
                    disabled={busy}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={update('email')} disabled={busy} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                disabled={busy}
                minLength={8}
                maxLength={72}
                required
              />
            </div>

            <FormError message={error} />

            <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>

          {mode === 'login' && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium text-muted-foreground">Demo account shortcuts</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials(DEMO_CREDENTIALS.admin)}
                  disabled={busy}
                >
                  Admin login
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials(DEMO_CREDENTIALS.user)}
                  disabled={busy}
                >
                  User login
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Fills the form — press Log in to continue.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Admin seed account: <code className="font-mono">admin@example.com</code> /{' '}
            <code className="font-mono">AdminPass123</code>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
