import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import FormError from './FormError.jsx';
import Pagination from './Pagination.jsx';
import { Badge } from './ui/badge.jsx';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';

const LIMIT = 10;
const NOTES_LIMIT = 12;
const GROUP_MEMBERS_LIMIT = 10;

function splitInterests(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortId(id) {
  return String(id).slice(-6);
}

function Field({ id, label, children, className }) {
  return (
    <div className={className || 'space-y-2'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function RoleSelect({ id, value, onValueChange }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">user</SelectItem>
        <SelectItem value="admin">admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

function InterestBadges({ interests }) {
  if (!interests?.length) return <span className="text-sm text-muted-foreground">No interests</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {interests.map((interest) => (
        <Badge key={interest} variant="outline">
          {interest}
        </Badge>
      ))}
    </div>
  );
}

export function UsersSection() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    interests: '',
  });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setResult(await api('/users', { params: { page, limit: LIMIT } }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const EMPTY_CREATE_FORM = { name: '', email: '', password: '', role: 'user', interests: '' };

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError('');
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError('');
  }

  async function create(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api('/users', {
        method: 'POST',
        body: {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          interests: splitInterests(createForm.interests),
        },
      });
      closeCreate();
      if (page !== 1) setPage(1);
      else await load();
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        name: editing.name,
        email: editing.email,
        role: editing.role,
        interests: splitInterests(editing.interests),
      };
      if (editing.password) body.password = editing.password;
      await api(`/users/${editing.id}`, { method: 'PUT', body });
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(user) {
    setError('');
    try {
      await api(`/users/${user._id}`, { method: 'DELETE' });
      if (result.data.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function editField(field) {
    return (event) => setEditing((current) => ({ ...current, [field]: event.target.value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>New user</Button>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreate(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Admins can create accounts with any role.</DialogDescription>
          </DialogHeader>
          <form id="create-user-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <Field id="new-name" label="Name">
              <Input
                id="new-name"
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                required
              />
            </Field>
            <Field id="new-email" label="Email">
              <Input
                id="new-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                required
              />
            </Field>
            <Field id="new-password" label="Password">
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                minLength={8}
                maxLength={72}
                required
              />
            </Field>
            <Field id="new-role" label="Role">
              <RoleSelect
                id="new-role"
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
              />
            </Field>
            <Field id="new-interests" label="Interests" className="sm:col-span-2">
              <Input
                id="new-interests"
                value={createForm.interests}
                onChange={(event) => setCreateForm({ ...createForm, interests: event.target.value })}
                placeholder="tech, music"
              />
            </Field>
          </form>
          <FormError message={createError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreate}>Cancel</Button>
            <Button type="submit" form="create-user-form" disabled={creating}>
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((user) => (
          <Card key={user._id}>
            {editing?.id === user._id ? (
              <form onSubmit={saveEdit}>
                <CardHeader>
                  <CardTitle>Edit user</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Field id={`edit-name-${user._id}`} label="Name">
                    <Input
                      id={`edit-name-${user._id}`}
                      value={editing.name}
                      onChange={editField('name')}
                      required
                    />
                  </Field>
                  <Field id={`edit-email-${user._id}`} label="Email">
                    <Input
                      id={`edit-email-${user._id}`}
                      type="email"
                      value={editing.email}
                      onChange={editField('email')}
                      required
                    />
                  </Field>
                  <Field id={`edit-role-${user._id}`} label="Role">
                    <RoleSelect
                      id={`edit-role-${user._id}`}
                      value={editing.role}
                      onValueChange={(value) => setEditing((current) => ({ ...current, role: value }))}
                    />
                  </Field>
                  <Field id={`edit-interests-${user._id}`} label="Interests">
                    <Input
                      id={`edit-interests-${user._id}`}
                      value={editing.interests}
                      onChange={editField('interests')}
                    />
                  </Field>
                  <Field id={`edit-password-${user._id}`} label="New password (optional)">
                    <Input
                      id={`edit-password-${user._id}`}
                      type="password"
                      value={editing.password}
                      onChange={editField('password')}
                      minLength={8}
                      maxLength={72}
                    />
                  </Field>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button type="submit" size="sm" disabled={busy}>Save</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-base">{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  <InterestBadges interests={user.interests} />
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        interests: (user.interests ?? []).join(', '),
                        password: '',
                      })
                    }
                  >
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={<Button type="button" size="sm" variant="destructive">Delete</Button>}
                    title={`Delete ${user.email}?`}
                    description="Their notes and posts will remain in the database. This action cannot be undone."
                    onConfirm={() => remove(user)}
                  />
                </CardFooter>
              </>
            )}
          </Card>
        ))}
      </div>

      <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
    </div>
  );
}

export function NotesSection() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  const [ownerNames, setOwnerNames] = useState({});

  // The notes API returns owner IDs only; load the user directory once to show names.
  useEffect(() => {
    let active = true;
    api('/users', { params: { page: 1, limit: 100 } })
      .then((data) => {
        if (active) setOwnerNames(Object.fromEntries(data.data.map((user) => [user._id, user.name])));
      })
      .catch(() => {
        // Fall back to the short owner id if the directory cannot be loaded.
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      setResult(await api('/notes', { params: { page, limit: NOTES_LIMIT } }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((note) => (
          <Card key={note._id}>
            <CardHeader>
              <CardTitle className="text-base">{note.title}</CardTitle>
              <CardDescription>
                owner {ownerNames[note.owner] || `#${shortId(note.owner)}`} · {new Date(note.updatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {result.data.length === 0 && <p className="text-sm text-muted-foreground">No notes found.</p>}

      <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
    </div>
  );
}

export function GroupsSection() {
  const [result, setResult] = useState({ data: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // One page number per interest group, so changing one group never affects another.
  const [groupPages, setGroupPages] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The endpoint paginates groups, not their members. Request all groups
      // (max 100 users exist) so each card can page its own members locally.
      setResult(await api('/users/grouped-by-interests', { params: { page: 1, limit: 100 } }));
      setGroupPages({});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setGroupPage(groupId, page) {
    setGroupPages((current) => ({ ...current, [groupId]: page }));
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />
      {loading && <p className="text-sm text-muted-foreground">Loading groups…</p>}

      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.map((group) => {
          const members = group.users || [];
          const totalPages = Math.max(1, Math.ceil(members.length / GROUP_MEMBERS_LIMIT));
          const requestedPage = groupPages[group._id] ?? 1;
          const currentPage = Math.min(requestedPage, totalPages);
          const visibleMembers = members.slice(
            (currentPage - 1) * GROUP_MEMBERS_LIMIT,
            currentPage * GROUP_MEMBERS_LIMIT,
          );

          return (
            <Card key={group._id}>
              <CardHeader>
                <CardTitle className="text-base">{group._id}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary">{group.count} user(s)</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  {visibleMembers.map((member) => (
                    <li key={member._id}>
                      {member.name} <span className="text-muted-foreground">({member.email})</span>
                    </li>
                  ))}
                </ul>
                {members.length > GROUP_MEMBERS_LIMIT && (
                  <div>
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={members.length}
                      onPage={(nextPage) => setGroupPage(group._id, nextPage)}
                      showLabel={false}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && result.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No groups found.</p>
      )}
    </div>
  );
}
