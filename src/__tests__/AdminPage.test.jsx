import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api.js';
import { GroupsSection, NotesSection, UsersSection } from '../components/AdminPage.jsx';

vi.mock('../api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  api: vi.fn(),
}));

// Radix Select relies on browser layout APIs that jsdom cannot provide, so the
// admin suite uses a native select stub to exercise the same change handlers.
vi.mock('../components/ui/select.jsx', async () => {
  const { createContext, useContext } = await import('react');
  const SelectContext = createContext(null);

  return {
    Select: ({ value, onValueChange, children }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ id, className }) => {
      const context = useContext(SelectContext);
      return (
        <select
          id={id}
          className={className}
          value={context.value}
          onChange={(event) => context.onValueChange(event.target.value)}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      );
    },
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
    SelectValue: () => null,
  };
});

const users = [
  { _id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'user', interests: ['tech', 'music'] },
  { _id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'admin', interests: [] },
];

const notes = [
  {
    _id: 'n1',
    owner: 'u1',
    title: 'Alice note',
    content: 'Note body',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const groups = [
  {
    _id: 'tech',
    count: 12,
    users: Array.from({ length: 12 }, (_, index) => ({
      _id: `t${index + 1}`,
      name: `Tech ${index + 1}`,
      email: `tech${index + 1}@example.com`,
    })),
  },
  {
    _id: 'music',
    count: 2,
    users: [
      { _id: 'm1', name: 'Music 1', email: 'music1@example.com' },
      { _id: 'm2', name: 'Music 2', email: 'music2@example.com' },
    ],
  },
];

function mockAdminApi({ userList = users, noteList = notes, groupList = groups } = {}) {
  api.mockImplementation(async (path, options = {}) => {
    if (path === '/users' && !options.method && options.params?.limit === 10) {
      return { data: userList, total: userList.length, totalPages: 1 };
    }
    if (path === '/users' && !options.method && options.params?.limit === 100) {
      return { data: userList, total: userList.length, totalPages: 1 };
    }
    if (path === '/users' && options.method === 'POST') return { data: options.body };
    if (path === '/users/u1' && options.method === 'PUT') return { data: options.body };
    if (path === '/users/u1' && options.method === 'DELETE') return {};
    if (path === '/notes' && !options.method) {
      return { data: noteList, total: noteList.length, totalPages: 1 };
    }
    if (path === '/users/grouped-by-interests') {
      return { data: groupList, total: groupList.length, totalPages: 1 };
    }
    throw new Error(`Unexpected API call: ${options.method || 'GET'} ${path}`);
  });
}

beforeEach(() => {
  api.mockReset();
  mockAdminApi();
});

describe('UsersSection', () => {
  it('lists users with pagination and shows role and interests', async () => {
    render(<UsersSection />);
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('user')).not.toHaveLength(0);
    expect(screen.getByText('music')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/users', { params: { page: 1, limit: 10 } });
  });

  it('creates a user from a dialog with the chosen role and interests', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    await userEvent.click(screen.getByRole('button', { name: 'New user' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Create user' })).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Name'), 'Carol');
    await userEvent.type(within(dialog).getByLabelText('Email'), 'carol@example.com');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'Password123');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'admin');
    await userEvent.type(within(dialog).getByLabelText('Interests'), 'tech, travel');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/users', {
        method: 'POST',
        body: {
          name: 'Carol',
          email: 'carol@example.com',
          password: 'Password123',
          role: 'admin',
          interests: ['tech', 'travel'],
        },
      }),
    );
  });

  it('edits a user role, name, and interests', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Edit' }));

    const name = await within(card).findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice Updated');
    await userEvent.selectOptions(within(card).getByLabelText('Role'), 'admin');

    await userEvent.click(within(card).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/users/u1', {
        method: 'PUT',
        body: {
          name: 'Alice Updated',
          email: 'alice@example.com',
          role: 'admin',
          interests: ['tech', 'music'],
        },
      }),
    );
  });

  it('deletes a user after confirmation', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }));
    const alert = await screen.findByRole('alertdialog');
    await userEvent.click(within(alert).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/users/u1', { method: 'DELETE' }));
  });
});

describe('NotesSection', () => {
  it('requests 12 notes without a filter and shows owner names', async () => {
    render(<NotesSection />);
    expect(await screen.findByText('Alice note')).toBeInTheDocument();

    expect(api).toHaveBeenCalledWith('/notes', { params: { page: 1, limit: 12 } });
    expect(api).toHaveBeenCalledWith('/users', { params: { page: 1, limit: 100 } });
    expect(screen.getByText(/owner Alice/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/filter/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /filter/i })).not.toBeInTheDocument();
  });
});

describe('GroupsSection', () => {
  it('requests all groups without a filter and shows at most 10 members each', async () => {
    render(<GroupsSection />);
    expect(await screen.findByText('tech')).toBeInTheDocument();

    expect(api).toHaveBeenCalledWith('/users/grouped-by-interests', {
      params: { page: 1, limit: 100 },
    });
    expect(screen.queryByPlaceholderText(/filter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Page 1 of 2/)).not.toBeInTheDocument();

    expect(screen.getByText('Tech 1')).toBeInTheDocument();
    expect(screen.getByText('Tech 10')).toBeInTheDocument();
    expect(screen.queryByText('Tech 11')).not.toBeInTheDocument();
    expect(screen.getByText('Music 1')).toBeInTheDocument();
  });

  it('pages each group independently', async () => {
    render(<GroupsSection />);
    await screen.findByText('tech');

    await userEvent.click(screen.getByRole('link', { name: 'Go to page 2' }));

    expect(await screen.findByText('Tech 11')).toBeInTheDocument();
    expect(screen.queryByText('Tech 1')).not.toBeInTheDocument();
    expect(screen.getByText('Music 1')).toBeInTheDocument();
    expect(screen.queryByText('Page 1 of 2 · 12 total')).not.toBeInTheDocument();
  });

  it('sizes group cards to their content without extra space', async () => {
    const { container } = render(<GroupsSection />);
    await screen.findByText('tech');

    const grid = container.querySelector('.grid.items-start');
    expect(grid).toBeInTheDocument();
    expect(grid.querySelector('[data-slot="card"]').className).not.toMatch(/min-h/);
  });
});
