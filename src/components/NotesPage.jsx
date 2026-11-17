import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../api.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import FormError from './FormError.jsx';
import Pagination from './Pagination.jsx';
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
import { Textarea } from './ui/textarea.jsx';

const LIMIT = 10;
const EMPTY_FORM = { title: '', content: '' };

export default function NotesPage({ user }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      // Admins can see all notes; keep this tab to the admin's own notes.
      if (user.role === 'admin') params.owner = user._id;
      setResult(await api('/notes', { params }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, user]);

  useEffect(() => {
    load();
  }, [load]);

  function updateCreate(field) {
    return (event) => setCreateForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function updateEdit(field) {
    return (event) => setEditForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function openCreate() {
    setCreateForm(EMPTY_FORM);
    setCreateError('');
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    setCreateError('');
  }

  function openEdit(note) {
    setEditingNote(note);
    setEditForm({ title: note.title, content: note.content });
    setEditError('');
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingNote(null);
    setEditForm(EMPTY_FORM);
    setEditError('');
  }

  async function createNote(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api('/notes', { method: 'POST', body: createForm });
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
    if (!editingNote) return;
    setUpdating(true);
    setEditError('');
    try {
      await api(`/notes/${editingNote._id}`, { method: 'PUT', body: editForm });
      closeEdit();
      await load();
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  async function remove(note) {
    setError('');
    try {
      await api(`/notes/${note._id}`, { method: 'DELETE' });
      if (result.data.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">My notes</h2>
        <Button type="button" onClick={openCreate}>New note</Button>
      </div>

      <FormError message={error} />
      {loading && <p className="text-sm text-muted-foreground">Loading notes…</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.data.map((note) => (
          <Card key={note._id}>
            <CardHeader>
              <CardTitle className="text-base">{note.title}</CardTitle>
              <CardDescription>Updated {new Date(note.updatedAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{note.content}</p>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEdit(note)}>
                Edit
              </Button>
              <ConfirmDialog
                trigger={<Button type="button" variant="destructive" size="sm">Delete</Button>}
                title={`Delete "${note.title}"?`}
                description="This permanently removes the note. This action cannot be undone."
                onConfirm={() => remove(note)}
              />
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && result.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}

      <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create note</DialogTitle>
            <DialogDescription>Write a new note and it will appear in the list below.</DialogDescription>
          </DialogHeader>
          <form id="create-note-form" onSubmit={createNote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-note-title">Title</Label>
              <Input
                id="create-note-title"
                value={createForm.title}
                onChange={updateCreate('title')}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-note-content">Content</Label>
              <Textarea
                id="create-note-content"
                value={createForm.content}
                onChange={updateCreate('content')}
                rows={4}
                required
              />
            </div>
          </form>
          <FormError message={createError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreate}>Cancel</Button>
            <Button type="submit" form="create-note-form" disabled={creating}>
              {creating ? 'Saving…' : 'Create note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
            <DialogDescription>Update the title and content, then save your changes.</DialogDescription>
          </DialogHeader>
          <form id="edit-note-form" onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-note-title">Title</Label>
              <Input
                id="edit-note-title"
                value={editForm.title}
                onChange={updateEdit('title')}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note-content">Content</Label>
              <Textarea
                id="edit-note-content"
                value={editForm.content}
                onChange={updateEdit('content')}
                rows={4}
                required
              />
            </div>
          </form>
          <FormError message={editError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" form="edit-note-form" disabled={updating}>
              {updating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
