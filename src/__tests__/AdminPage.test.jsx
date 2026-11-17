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
  const { createContext, useCallback, useContext, useEffect, useState } = await import('react');
  const SelectContext = createContext(null);

  return {
    Select: ({ value, onValueChange, children }) => {
      const [items, setItems] = useState([]);
      const register = useCallback(
        (item) => setItems((current) => (current.includes(item) ? current : [...current, item])),
        [],
      );
      const unregister = useCallback(
        (item) => setItems((current) => current.filter((value) => value !== item)),
        [],
      );
      return (
        <SelectContext.Provider value={{ value, onValueChange, items, register, unregister }}>
          {children}
        </SelectContext.Provider>
      );
    },
    SelectTrigger: ({ id, className }) => {
      const context = useContext(SelectContext);
      return (
        <select
          id={id}
          className={className}
          value={context.value}
          onChange={(event) => context.onValueChange(event.target.value)}
        >
          {context.items.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      );
    },
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ value }) => {
      const context = useContext(SelectContext);
      useEffect(() => {
        context.register(value);
        return () => context.unregister(value);
      }, [value, context.register, context.unregister]);
      return null;
    },
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

function adminApiImplementation({ userList = users, noteList = notes, groupList = groups } = {}) {
  return async (path, options = {}) => {
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
      const interest = options.params?.interest;
      const data = interest ? groupList.filter((group) => group._id === interest) : groupList;
      return { data, total: data.length, totalPages: 1 };
    }
    throw new Error(`Unexpected API call: ${options.method || 'GET'} ${path}`);
  };
}

function mockAdminApi(options) {
  api.mockImplementation(adminApiImplementation(options));
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

  it('edits a user role, name, and interests in a dialog', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();

    const name = within(dialog).getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice Updated');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'admin');
    await userEvent.clear(within(dialog).getByLabelText('Interests'));
    await userEvent.type(within(dialog).getByLabelText('Interests'), 'tech, travel, music');
    await userEvent.type(within(dialog).getByLabelText('New password (optional)'), 'NewPassword123');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/users/u1', {
        method: 'PUT',
        body: {
          name: 'Alice Updated',
          email: 'alice@example.com',
          role: 'admin',
          interests: ['tech', 'travel', 'music'],
          password: 'NewPassword123',
        },
      }),
    );
  });

  it('closes the edit dialog without saving when cancelled', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api).not.toHaveBeenCalledWith('/users/u1', { method: 'PUT', body: expect.anything() });
  });

  it('shows update errors in the edit dialog and keeps it open', async () => {
    const baseApi = adminApiImplementation();
    api.mockImplementation(async (path, options = {}) => {
      if (path === '/users/u1' && options.method === 'PUT') {
        throw new Error('Email already in use');
      }
      return baseApi(path, options);
    });

    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('Email already in use')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    render(<UsersSection />);
    await screen.findByText('Alice');

    const card = screen.getByText('Alice').closest('[data-slot="card"]');
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }));
    const alert = await screen.findByRole('alertdialog');
    expect(within(alert).getByText(/notes and posts will also be deleted/i)).toBeInTheDocument();
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
  it('lists every existing interest in the select and shows its users in a table', async () => {
    render(<GroupsSection />);
    expect(await screen.findByRole('columnheader', { name: 'Name' })).toBeInTheDocument();

    expect(api).toHaveBeenCalledWith('/users', { params: { page: 1, limit: 100 } });
    expect(api).toHaveBeenCalledWith('/users/grouped-by-interests', {
      params: { page: 1, limit: 100, interest: 'tech' },
    });
    const groupedCalls = api.mock.calls.filter((call) => call[0] === '/users/grouped-by-interests');
    expect(groupedCalls.every((call) => call[1]?.params?.interest)).toBe(true);

    const select = screen.getByLabelText('Interest');
    expect(select).toHaveValue('tech');
    expect(within(select).getAllByRole('option').map((option) => option.value)).toEqual([
      'music',
      'tech',
    ]);

    expect(screen.getByRole('cell', { name: 'Tech 1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Tech 10' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Tech 11' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Music 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing:/)).not.toBeInTheDocument();
  });

  it('applies a different interest as soon as the select changes', async () => {
    render(<GroupsSection />);
    await screen.findByRole('columnheader', { name: 'Name' });

    await userEvent.selectOptions(screen.getByLabelText('Interest'), 'music');

    expect(await screen.findByRole('cell', { name: 'Music 1' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/users/grouped-by-interests', {
      params: { page: 1, limit: 100, interest: 'music' },
    });
    expect(screen.queryByRole('cell', { name: 'Tech 1' })).not.toBeInTheDocument();
  });

  it('paginates the users below the table at full width', async () => {
    render(<GroupsSection />);
    await screen.findByRole('columnheader', { name: 'Name' });
    expect(screen.getByText(/Page 1 of 2 · 12 total/)).toBeInTheDocument();
    expect(document.querySelector('[data-slot="pagination-content"]')).toHaveClass(
      'w-full',
      'justify-between',
    );

    await userEvent.click(screen.getByRole('link', { name: 'Go to page 2' }));

    expect(await screen.findByRole('cell', { name: 'Tech 11' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Tech 1' })).not.toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 2 · 12 total/)).toBeInTheDocument();
  });

  it('renders a shadcn table with name and email columns', async () => {
    render(<GroupsSection />);
    await screen.findByRole('table');

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });
});
