import { cn } from 'cn';
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAdmin, RequireAuth, PublicOnly, useAuth } from './auth.jsx';
import { GroupsSection, NotesSection, UsersSection } from './components/AdminPage.jsx';
import AuthPage from './components/AuthPage.jsx';
import NotesPage from './components/NotesPage.jsx';
import PostsPage from './components/PostsPage.jsx';
import { Badge } from './components/ui/badge.jsx';
import { Button, buttonVariants } from './components/ui/button.jsx';
import { Separator } from './components/ui/separator.jsx';

function AdminView({ title, children }) {
  return (
    <section className="space-y-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function ProtectedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const navClass = ({ isActive }) =>
    cn(
      buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm' }),
      'w-full justify-start',
    );

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b bg-card/50 p-4 md:sticky md:top-0 md:h-svh md:w-64 md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Note Taker</h1>
          <p className="text-xs text-muted-foreground">Secure notes and posts</p>
        </div>

        <Separator />

        <nav aria-label="Main" className="flex flex-col gap-1">
          {user.role === 'admin' && <NavLink to="/admin/notes" className={navClass}>All notes</NavLink>}
          <NavLink to="/notes" className={navClass}>Notes</NavLink>
          <NavLink to="/posts" className={navClass}>Posts</NavLink>
          {user.role === 'admin' && (
            <>
              <NavLink to="/admin/users" className={navClass}>Users</NavLink>
              <NavLink to="/admin/interests" className={navClass}>Interests</NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-3 border-t pt-4">
          <div className="space-y-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
          </div>
          <Button variant="destructive" size="sm" className="w-full" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <AuthPage mode="login" />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <AuthPage mode="register" />
          </PublicOnly>
        }
      />

      <Route
        element={
          <RequireAuth>
            <ProtectedLayout />
          </RequireAuth>
        }
      >
        <Route path="/notes" element={<NotesPage user={user} />} />
        <Route path="/posts" element={<PostsPage user={user} />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Navigate to="/admin/users" replace />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <AdminView title="Users"><UsersSection /></AdminView>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <RequireAdmin>
              <AdminView title="All notes"><NotesSection /></AdminView>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/interests"
          element={
            <RequireAdmin>
              <AdminView title="Interests"><GroupsSection /></AdminView>
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/notes" replace />} />
      <Route path="*" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}
