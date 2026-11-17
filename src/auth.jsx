import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, clearToken, getToken } from './api.js';

const AuthContext = createContext(null);

function SessionLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Checking session…</p>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    api('/me')
      .then((result) => {
        if (!cancelled) setUser(result.data);
      })
      .catch(() => {
        clearToken();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      login: (nextUser) => setUser(nextUser),
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, checking],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/notes" replace />;
  return children;
}

export function PublicOnly({ children }) {
  const { user, checking } = useAuth();

  if (checking) return <SessionLoading />;
  if (user) return <Navigate to="/notes" replace />;
  return children;
}
