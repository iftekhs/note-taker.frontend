# Note Taker Frontend

React 19 + Vite frontend for the secure note-taking API, styled with Tailwind CSS v4 and shadcn/ui components.

## Run

Start the backend first (`../note-taker.backend`, port 4000), then:

```bash
npm install
npm run dev
```

Open `http://localhost:5174`. Vite proxies `/api` to `http://localhost:4000`, so no frontend environment variables are needed.

Demo credentials:

```text
admin@example.com / AdminPass123   (seeded admin)
demo1@example.com / Password123    (after `npm run seed:demo` in the backend)
```

The login screen always shows **Admin login** and **User login** shortcuts (in development and production) that fill the email and password fields with the credentials above.

## Testing

```bash
npm test
```

The Vitest suite runs in jsdom with React Testing Library. Page suites mock `api.js`; the API wrapper suite mocks `fetch`. Coverage includes token handling, auth provider and route guards, login/register pages, notes and posts flows, admin users/notes/groups sections, pagination, and the app shell/routing.

## Build

```bash
npm run build
npm run preview
```

`npm run preview` serves the built app on its own port. The backend is API-only and does not serve frontend assets.

## Routes

| Path | Access | Description |
|---|---|---|
| `/login` | Public | Log in; redirects to `/notes` if already authenticated |
| `/register` | Public | Register; redirects to `/notes` if already authenticated |
| `/notes` | Authenticated | Notes list and editor |
| `/posts` | Authenticated | Posts list, create, and "My posts" |
| `/admin/users` | Admin only | User management |
| `/admin/notes` | Admin only | All notes (read-only) |
| `/admin/interests` | Admin only | Users grouped by interests |
| `/` and unknown paths | — | Redirect to `/notes` (then to `/login` if unauthenticated) |

`RequireAuth` guards the protected layout, and `RequireAdmin` additionally guards the `/admin/*` pages. `/admin` redirects to `/admin/users`. Deep links work through Vite's SPA fallback.

## Features

- Left sidebar navigation with flat top-level options: Notes, Posts, and (for admins) Users, All notes, and Grouped by interests
- React Router navigation with protected routes and post-login redirect to the originally requested page
- Login and registration with JWT stored in `localStorage`
- Notes: create and edit in modals (Dialog), delete via confirmation dialog, paginated list
- Posts: create in a modal, paginated list, and "My posts" via the `$lookup` aggregation
- Admin pages (admins only):
  - paginated user list with create in a modal, edit (name/email/role/interests/password), and delete
  - all notes, paginated, showing owner names (read-only)
  - users grouped by interests, with independent pagination per group (10 users per page)
- Session-expiry handling: a 401 clears the session and the router redirects to `/login`
- Tailwind CSS v4 utilities and shadcn/ui components (Card, Button, Input, Label, Textarea, Select, Tabs, Badge, Alert, Separator, Dialog, AlertDialog, Pagination); note creation/editing and user creation open a Dialog, deletions use a themed confirmation dialog instead of `window.confirm`, and every list uses the shadcn Pagination UI (12 notes per page on All notes)

## Styling

There is no hand-written CSS. `src/index.css` only imports Tailwind v4, the shadcn theme, and fonts. `components.json` configures shadcn (`radix-nova` style), `jsconfig.json` and `vite.config.js` provide the `@/*` alias, and generated components live in `src/components/ui/`.

## Structure

```text
index.html
components.json       # shadcn config (radix-nova)
jsconfig.json         # @/* -> ./src/*
vite.config.js        # port 5174, /api proxy, Tailwind + @ alias
src/
  main.jsx            # BrowserRouter + AuthProvider
  App.jsx             # routes and protected layout
  auth.jsx            # session context and route guards
  api.js              # fetch wrapper, token, error shape
  index.css           # Tailwind v4 + shadcn theme
  components/
    AuthPage.jsx
    NotesPage.jsx
    PostsPage.jsx
    AdminPage.jsx
    Pagination.jsx
    FormError.jsx     # shadcn Alert wrapper for API errors
    ConfirmDialog.jsx # shadcn AlertDialog wrapper for deletes
    ui/               # shadcn-generated components
```

## Notes

- Admin "All notes" is read-only because the API grants admin read access but keeps note mutations owner-only.
- Tokens live in `localStorage` for simplicity; production would use an HttpOnly cookie.
