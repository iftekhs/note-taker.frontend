import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { api, errorMessage } from '../api.js';
import FormError from './FormError.jsx';
import ListLoader from './ListLoader.jsx';
import Pagination from './Pagination.jsx';
import { Badge } from './ui/badge.jsx';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx';
import { Textarea } from './ui/textarea.jsx';

const LIMIT = 10;
const EMPTY_FORM = { title: '', content: '' };

function shortId(id) {
  return String(id).slice(-6);
}

export default function PostsPage({ user }) {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [myPage, setMyPage] = useState(1);
  const [myResult, setMyResult] = useState(null);
  const [myError, setMyError] = useState('');
  const [myLoading, setMyLoading] = useState(false);
  const mineRequest = useRef(0);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      setResult(await api('/posts', { params: { page: targetPage, limit: LIMIT } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMine = useCallback(async (targetPage = myPage) => {
    const requestId = ++mineRequest.current;
    setMyLoading(true);
    setMyError('');
    try {
      const data = await api(`/users/${user._id}/posts`, {
        params: { page: targetPage, limit: LIMIT },
      });
      if (requestId === mineRequest.current) setMyResult(data);
    } catch (err) {
      if (requestId === mineRequest.current) setMyError(errorMessage(err));
    } finally {
      if (requestId === mineRequest.current) setMyLoading(false);
    }
  }, [myPage, user._id]);

  useEffect(() => {
    if (tab === 'mine') loadMine();
  }, [tab, loadMine]);

  function updateCreate(field) {
    return (event) => setCreateForm((current) => ({ ...current, [field]: event.target.value }));
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

  async function createPost(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api('/posts', { method: 'POST', body: createForm });
      if (tab === 'mine') {
        const targetPage = myPage !== 1 ? 1 : myPage;
        await loadMine(targetPage);
        if (targetPage !== myPage) setMyPage(targetPage);
      } else {
        const targetPage = page !== 1 ? 1 : page;
        await load(targetPage);
        if (targetPage !== page) setPage(targetPage);
      }
      closeCreate();
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function changeTab(value) {
    setTab(value);
    if (value === 'mine') setMyPage(1);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Posts</h2>
        <Button type="button" onClick={openCreate}>New post</Button>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList>
          <TabsTrigger value="all">All posts</TabsTrigger>
          <TabsTrigger value="mine">My posts</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6 space-y-4" aria-busy={loading}>
          <FormError message={error} />
          {loading ? (
            <ListLoader label="Loading posts…" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.data.map((post) => (
                  <Card key={post._id}>
                    <CardHeader>
                      <CardTitle className="text-base">{post.title}</CardTitle>
                      <CardDescription>
                        Author #{shortId(post.author)} · {new Date(post.createdAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {result.data.length === 0 && (
                <p className="text-sm text-muted-foreground">No posts yet.</p>
              )}
              <Pagination page={page} totalPages={result.totalPages} total={result.total} onPage={setPage} />
            </>
          )}
        </TabsContent>
        <TabsContent value="mine" className="mt-6 space-y-4" aria-busy={myLoading}>
          <FormError message={myError} />
          {myLoading ? (
            <ListLoader label="Loading your posts…" />
          ) : (
            myResult && (
              <>
                <p className="text-sm text-muted-foreground">
                  {myResult.user?.name} · <Badge variant="secondary">{myResult.total} post(s)</Badge>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {myResult.data.map((post) => (
                    <Card key={post._id}>
                      <CardHeader>
                        <CardTitle className="text-base">{post.title}</CardTitle>
                        <CardDescription>{new Date(post.createdAt).toLocaleString()}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {myResult.data.length === 0 && (
                  <p className="text-sm text-muted-foreground">You have not posted yet.</p>
                )}
                <Pagination page={myPage} totalPages={myResult.totalPages} total={myResult.total} onPage={setMyPage} />
              </>
            )
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open && !creating) closeCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create post</DialogTitle>
            <DialogDescription>Publish a post that every authenticated user can read.</DialogDescription>
          </DialogHeader>
          <form id="create-post-form" onSubmit={createPost} aria-busy={creating} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-post-title">Title</Label>
              <Input
                id="create-post-title"
                value={createForm.title}
                onChange={updateCreate('title')}
                maxLength={200}
                disabled={creating}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-post-content">Content</Label>
              <Textarea
                id="create-post-content"
                value={createForm.content}
                onChange={updateCreate('content')}
                rows={4}
                disabled={creating}
                required
              />
            </div>
          </form>
          <FormError message={createError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCreate} disabled={creating}>Cancel</Button>
            <Button type="submit" form="create-post-form" disabled={creating} aria-busy={creating}>
              {creating && <LoaderCircle className="size-4 animate-spin" />}
              {creating ? 'Publishing…' : 'Publish post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
