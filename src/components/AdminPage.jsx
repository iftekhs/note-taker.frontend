import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { api, errorMessage } from '../api.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import FormError from './FormError.jsx';
import ListLoader from './ListLoader.jsx';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.jsx';

const LIMIT = 10;
const NOTES_LIMIT = 12;
const USERS_TABLE_PAGE_SIZE = 10;

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

function RoleSelect({ id, value, onValueChange, disabled }) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
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

function InterestSelect({ id, value, interests, onValueChange, disabled }) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className="min-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        hideScrollButtons
        position="popper"
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
      >
        {interests.map((interest) => (
          <SelectItem key={interest} value={interest}>
            {interest}
          </SelectItem>
        ))}
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
  const [editError, setEditError] = useState('');
  const [listLoading, setListLoading] = useState(false);

  const load = useCallback(async (targetPage = page) => {
    setListLoading(true);
    setError('');
    try {
      setResult(await api('/users', { params: { page: targetPage, limit: LIMIT } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setListLoading(false);
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

  function openEdit(user) {
    setEditing({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: (user.interests ?? []).join(', '),
      password: '',
    });
    setEditError('');
  }

  function closeEdit() {
    setEditing(null);
    setEditError('');
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
      const targetPage = page !== 1 ? 1 : page;
      await load(targetPage);
      if (targetPage !== page) setPage(targetPage);
      closeCreate();
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    setBusy(true);
    setEditError('');
    try {
      const body = {
        name: editing.name,
        email: editing.email,
        role: editing.role,
        interests: splitInterests(editing.interests),
      };
      if (editing.password) body.password = editing.password;
      await api(`/users/${editing.id}`, { method: 'PUT', body });
      await load(page);
      closeEdit();
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(user) {
    await api(`/users/${user._id}`, { method: 'DELETE' });
    const targetPage = result.data.length === 1 && page > 1 ? page - 1 : page;
    await load(targetPage);
    if (targetPage !== page) setPage(targetPage);
    return true;
  }

  function editField(field) {
    return (event) => setEditing((current) => ({ ...current, [field]: event.target.value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>New user</Button>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open && !creating) closeCreate(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Admins can create accounts with any role.</DialogDescription>
          </DialogHeader>
          <form id="create-user-form" onSubmit={create} aria-busy={creating} className="grid gap-4 sm:grid-cols-2">
            <Field id="new-name" label="Name">
              <Input
                id="new-name"
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                disabled={creating}
                required
              />
            </Field>
            <Field id="new-email" label="Email">
              <Input
                id="new-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                disabled={creating}
                required
              />
            </Field>
            <Field id="new-password" label="Password">
              <Input
                id="new-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                disabled={creating}
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
                disabled={creating}
              />
            </Field>
            <Field id="new-interests" label="Interests" className="sm:col-span-2">
              <Input
                id="new-interests"
                value={createForm.interests}
                onChange={(event) => setCreateForm({ ...createForm, interests: event.target.value })}
                placeholder="tech, music"
                disabled={creating}
              />
            </Field>
          </form>
          <FormError message={createError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreate} disabled={creating}>Cancel</Button>
            <Button type="submit" form="create-user-form" disabled={creating} aria-busy={creating}>
              {creating && <LoaderCircle className="size-4 animate-spin" />}
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !busy) closeEdit(); }}>
        {editing && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Update account details and role for {editing.email}.</DialogDescription>
            </DialogHeader>
            <form id="edit-user-form" onSubmit={saveEdit} aria-busy={busy} className="grid gap-4 sm:grid-cols-2">
              <Field id="edit-name" label="Name">
                <Input
                  id="edit-name"
                  value={editing.name}
                  onChange={editField('name')}
                  disabled={busy}
                  required
                />
              </Field>
              <Field id="edit-email" label="Email">
                <Input
                  id="edit-email"
                  type="email"
                  value={editing.email}
                  onChange={editField('email')}
                  disabled={busy}
                  required
                />
              </Field>
              <Field id="edit-role" label="Role">
                <RoleSelect
                  id="edit-role"
                  value={editing.role}
                  onValueChange={(value) => setEditing((current) => ({ ...current, role: value }))}
                  disabled={busy}
                />
              </Field>
              <Field id="edit-interests" label="Interests">
                <Input
                  id="edit-interests"
                  value={editing.interests}
                  onChange={editField('interests')}
                  disabled={busy}
                />
              </Field>
              <Field id="edit-password" label="New password (optional)" className="sm:col-span-2">
                <Input
                  id="edit-password"
                  type="password"
                  value={editing.password}
                  onChange={editField('password')}
                  disabled={busy}
                  minLength={8}
                  maxLength={72}
                />
              </Field>
            </form>
            <FormError message={editError} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEdit} disabled={busy}>Cancel</Button>
              <Button type="submit" form="edit-user-form" disabled={busy} aria-busy={busy}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <FormError message={error} />
      {listLoading ? (
        <ListLoader label="Loading users…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((user) => (
              <Card key={user._id}>
                <CardHeader>
                  <CardTitle className="text-base">{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                  <InterestBadges interests={user.interests} />
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(user)}>
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={<Button type="button" size="sm" variant="destructive">Delete</Button>}
                    title={`Delete ${user.email}?`}
                    description="Their notes and posts will also be deleted. This action cannot be undone."
                    onConfirm={() => remove(user)}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>

          {result.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}

          <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function NotesSection() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerNames, setOwnerNames] = useState({});

  useEffect(() => {
    let active = true;
    api('/users', { params: { page: 1, limit: 100 } })
      .then((data) => {
        if (active) setOwnerNames(Object.fromEntries(data.data.map((user) => [user._id, user.name])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await api('/notes', { params: { page, limit: NOTES_LIMIT } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <FormError message={error} />
      {loading ? (
        <ListLoader label="Loading notes…" />
      ) : (
        <>
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

          {result.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes found.</p>
          )}

          <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export function GroupsSection() {
  const DEFAULT_INTEREST = 'tech';
  const [interests, setInterests] = useState([]);
  const [interestsReady, setInterestsReady] = useState(false);
  const [interest, setInterest] = useState(DEFAULT_INTEREST);
  const [result, setResult] = useState({ data: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const loadInterests = async () => {
      try {
        const users = await api('/users', { params: { page: 1, limit: 100 } });
        const values = [
          ...new Set((users.data ?? []).flatMap((user) => user.interests ?? [])),
        ].sort();
        if (!active) return;
        setInterests(values);
        const initial = values.includes(DEFAULT_INTEREST) ? DEFAULT_INTEREST : values[0] ?? '';
        setInterest(initial);
        setInterestsReady(true);
      } catch (err) {
        if (active) setError(errorMessage(err));
      }
    };
    loadInterests();
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!interestsReady || !interest) return;
    setLoading(true);
    setError('');
    try {
      setResult(
        await api('/users/grouped-by-interests', {
          params: { page: 1, limit: 100, interest },
        }),
      );
      setPage(1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [interest, interestsReady]);

  useEffect(() => {
    load();
  }, [load]);

  const members = result.data[0]?.users ?? [];
  const totalPages = Math.max(1, Math.ceil(members.length / USERS_TABLE_PAGE_SIZE));
  const visibleMembers = members.slice(
    (page - 1) * USERS_TABLE_PAGE_SIZE,
    page * USERS_TABLE_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label htmlFor="interest-filter">Interest</Label>
        <InterestSelect
          id="interest-filter"
          value={interest}
          interests={interests}
          onValueChange={setInterest}
          disabled={!interestsReady || loading}
        />
      </div>

      <FormError message={error} />
      {!interestsReady && !error ? (
        <ListLoader label="Loading interests…" />
      ) : loading ? (
        <ListLoader label="Loading users…" />
      ) : result.data[0] ? (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMembers.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                </TableRow>
              ))}
              {visibleMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No users found for this interest.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={members.length}
              onPage={setPage}
              align="right"
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No users found for this interest.</p>
      )}
    </div>
  );
}
