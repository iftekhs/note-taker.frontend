import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api.js';
import NotesPage from '../components/NotesPage.jsx';

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

const user = { _id: 'u1', name: 'Note User', email: 'user@example.com', role: 'user' };
const admin = { _id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin' };

function note(id, title, content = 'Body') {
  return { _id: id, title, content, owner: user._id, updatedAt: '2026-01-01T00:00:00.000Z' };
}

function mockNotesApi({ data = [note('n1', 'First note')], total = data.length, totalPages = 1 } = {}) {
  api.mockImplementation(async (path, options = {}) => {
    if (path === '/notes' && !options.method) {
      return { data, total, totalPages, page: options.params?.page ?? 1, limit: 10 };
    }
    if (path === '/notes' && options.method === 'POST') return { data: note('n2', options.body.title) };
    if (path === `/notes/n1` && options.method === 'PUT') return { data: note('n1', options.body.title) };
    if (path === `/notes/n1` && options.method === 'DELETE') return {};
    throw new Error(`Unexpected API call: ${options.method || 'GET'} ${path}`);
  });
}

beforeEach(() => {
  api.mockReset();
  mockNotesApi();
});

describe('NotesPage', () => {
  it('loads the signed-in user notes with pagination params', async () => {
    render(<NotesPage user={user} />);
    expect(await screen.findByText('First note')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/notes', { params: { page: 1, limit: 10 } });
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('scopes the admin My notes tab to the admin owner', async () => {
    render(<NotesPage user={admin} />);
    await screen.findByText('First note');
    expect(api).toHaveBeenCalledWith('/notes', {
      params: { page: 1, limit: 10, owner: admin._id },
    });
  });

  it('creates a note through a dialog and reloads the list', async () => {
    render(<NotesPage user={user} />);
    await screen.findByText('First note');

    await userEvent.click(screen.getByRole('button', { name: 'New note' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Create note' })).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Title'), 'Second note');
    await userEvent.type(within(dialog).getByLabelText('Content'), 'New content');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create note' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/notes', {
        method: 'POST',
        body: { title: 'Second note', content: 'New content' },
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a note through a prefilled dialog', async () => {
    render(<NotesPage user={user} />);
    await screen.findByText('First note');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const title = within(dialog).getByLabelText('Title');
    expect(title).toHaveValue('First note');

    await userEvent.clear(title);
    await userEvent.type(title, 'Renamed note');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/notes/n1', {
        method: 'PUT',
        body: { title: 'Renamed note', content: 'Body' },
      }),
    );
  });

  it('deletes a note only after confirmation', async () => {
    render(<NotesPage user={user} />);
    await screen.findByText('First note');

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const alert = await screen.findByRole('alertdialog');
    expect(within(alert).getByText(/permanently removes the note/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/notes/n1', { method: 'DELETE' });

    await userEvent.click(within(alert).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/notes/n1', { method: 'DELETE' }));
  });

  it('loads another page when pagination is used', async () => {
    mockNotesApi({ data: [note('n1', 'First note')], total: 21, totalPages: 3 });
    render(<NotesPage user={user} />);
    await screen.findByText('First note');

    await userEvent.click(screen.getByRole('link', { name: 'Go to page 2' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/notes', { params: { page: 2, limit: 10 } }),
    );
  });

  it('shows a load error', async () => {
    api.mockRejectedValueOnce(Object.assign(new Error(''), { message: 'Network down' }));
    render(<NotesPage user={user} />);
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });
});
