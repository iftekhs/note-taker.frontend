import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api.js';
import PostsPage from '../components/PostsPage.jsx';

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

const user = { _id: 'u1', name: 'Post User', email: 'user@example.com', role: 'user' };

function post(id, title, author = user._id) {
  return { _id: id, title, content: `${title} body`, author, createdAt: '2026-01-01T00:00:00.000Z' };
}

function mockPostsApi({ posts = [post('p1', 'Public post')], total = 1, totalPages = 1 } = {}) {
  api.mockImplementation(async (path, options = {}) => {
    if (path === '/posts' && !options.method) return { data: posts, total, totalPages };
    if (path === '/posts' && options.method === 'POST') return { data: post('p2', options.body.title) };
    if (path === `/users/${user._id}/posts`) {
      return {
        user: { name: user.name },
        data: [post('p1', 'My post')],
        total: 1,
        totalPages: 1,
      };
    }
    throw new Error(`Unexpected API call: ${options.method || 'GET'} ${path}`);
  });
}

beforeEach(() => {
  api.mockReset();
  mockPostsApi();
});

describe('PostsPage', () => {
  it('lists all posts for every authenticated user with pagination params', async () => {
    render(<PostsPage user={user} />);
    expect(await screen.findByText('Public post')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/posts', { params: { page: 1, limit: 10 } });
  });

  it('uses the exact My posts tab label and loads the $lookup result', async () => {
    render(<PostsPage user={user} />);
    await screen.findByText('Public post');

    const mineTab = screen.getByRole('tab', { name: 'My posts' });
    expect(mineTab).toBeInTheDocument();
    await userEvent.click(mineTab);

    expect(await screen.findByText('My post')).toBeInTheDocument();
    expect(screen.getByText(`${user.name} ·`)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(`/users/${user._id}/posts`, {
      params: { page: 1, limit: 10 },
    });
  });

  it('creates a post through a dialog with no update or delete controls', async () => {
    render(<PostsPage user={user} />);
    await screen.findByText('Public post');

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New post' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Fresh post');
    await userEvent.type(within(dialog).getByLabelText('Content'), 'Fresh content');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publish post' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/posts', {
        method: 'POST',
        body: { title: 'Fresh post', content: 'Fresh content' },
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('paginates the all-posts list', async () => {
    mockPostsApi({ posts: [post('p1', 'Public post')], total: 15, totalPages: 2 });
    render(<PostsPage user={user} />);
    await screen.findByText('Public post');

    await userEvent.click(screen.getByRole('link', { name: 'Go to page 2' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/posts', { params: { page: 2, limit: 10 } }),
    );
  });

  it('shows an inline error when the post list fails', async () => {
    api.mockRejectedValueOnce(Object.assign(new Error(''), { message: 'Cannot load posts' }));
    render(<PostsPage user={user} />);
    expect(await screen.findByText('Cannot load posts')).toBeInTheDocument();
  });
});
