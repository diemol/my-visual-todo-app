# My Visual ToDo App

A simple Node.js/React todo app adapted from Docker's [101-tutorial](https://github.com/dockersamples/101-tutorial). Used as a demo target for automated testing talks and framework demos.

## Running the app

```bash
npm install
npm run dev        # dev server with nodemon (auto-reload)
npm start          # production
```

App runs at `http://localhost:4000`. Port is configurable via the `PORT` env var.

## Tech stack

- **Backend**: Node.js 22, Express 5
- **Frontend**: React (browser-loaded via script tags), React-Bootstrap, Babel in-browser transpilation
- **Database**: SQLite by default (`better-sqlite3`); switches to MySQL when `MYSQL_HOST` env var is set
- **Auth**: `express-basic-auth` package is installed but not currently wired up in the server
- **Tests**: Jest

## Project structure

```
src/
  index.js              Express server entry point
  persistence/
    index.js            Selects SQLite or MySQL based on MYSQL_HOST env var
    sqlite.js           SQLite implementation (default)
    mysql.js            MySQL implementation
    todo.db             SQLite database file (git-ignored in practice)
  routes/
    addItem.js          POST /items
    getItems.js         GET /items
    updateItem.js       PUT /items/:id
    deleteItem.js       DELETE /items/:id
    deleteItems.js      DELETE /items
  static/
    index.html          Single-page app shell
    js/app.js           React components (JSX, transpiled in-browser by Babel)
    css/styles.css      App styles
spec/
  routes/               Jest unit tests for route handlers
  persistence/          Jest unit tests for persistence layer
```

## API endpoints

### Todo items

| Method | Path | Description |
|--------|------|-------------|
| GET | `/items` | Returns all todo items as JSON array |
| POST | `/items` | Creates a new item (`{ name }` body); returns the created item |
| PUT | `/items/:id` | Updates an item (`{ name, completed }` body); returns updated item |
| DELETE | `/items/:id` | Deletes a single item |
| DELETE | `/items` | Deletes all items |

Item schema: `{ id: uuid, name: string, completed: boolean }`

### Auth demo pages

Three pages that each demonstrate a different authentication approach. All use `admin` / `admin` as default credentials (overridable via env vars).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/basic-auth` | HTTP Basic Auth — browser-native credential dialog |
| GET | `/session` | Session Cookie Auth — login form, signed `session_id` cookie |
| POST | `/session/login` | Validate credentials, set cookie (`{ username, password }` body) |
| POST | `/session/logout` | Clear session cookie |
| GET | `/jwt` | JWT Token Auth — login form, token stored in `localStorage` |
| POST | `/jwt/login` | Validate credentials, return JWT (`{ username, password }` body) |
| GET | `/jwt/verify` | Validate Bearer token (`Authorization: Bearer <token>` header) |

#### How each auth type works

**Basic Auth (`/basic-auth`)** — Browser sends `Authorization: Basic <base64>` header. No session or cookie. Cancel redirects to `/`.

**Session Cookie (`/session`)** — Login form POSTs credentials; server sets a signed `session_id` cookie (HMAC-SHA256, stateless). Server checks the cookie on each GET and renders success or login form. Secret: `SESSION_SECRET` env var (default `demo-session-secret`).

**JWT (`/jwt`)** — Login form POSTs credentials; server returns a HS256 JWT. Page JS stores it under `localStorage['jwt_token']` and sends it as `Authorization: Bearer` on `/jwt/verify`. Secret: `JWT_SECRET` env var (default `demo-jwt-secret`). Token expiry: 1 hour.

#### How tests can bypass the login UI

**Basic Auth** — Send `Authorization: Basic <base64(user:pass)>` header directly.

**Session Cookie** — Call `POST /session/login` to get a valid cookie, then inject it:
```js
// Playwright
await context.addCookies([{ name: 'session_id', value: '...', url: 'http://localhost:3000' }]);
```

**JWT** — Call `POST /jwt/login` to get a token, then inject it into localStorage:
```js
// Playwright
const { token } = await request.post('/jwt/login', { data: { username: 'admin', password: 'admin' } }).json();
await page.evaluate((t) => localStorage.setItem('jwt_token', t), token);
await page.goto('/jwt'); // page checks localStorage and shows success directly
```

## Frontend components

All in `src/static/js/app.js` (React JSX, transpiled client-side by Babel):

- **App** — root component, Bootstrap grid wrapper
- **TodoListCard** — fetches and manages item list state
- **AddItemForm** — text input + submit button to add new items
- **ItemDisplay** — renders each item: toggle checkbox, name, delete button, and a `picsum.photos` image seeded by item name

## Testing selectors (data-testid)

Key `data-testid` attributes used for automated testing:

| Selector | Element |
|----------|---------|
| `new-item-text` | Text input for new item name |
| `new-item-button` | Submit button to add a new item |
| `item-name` | Item name column in each row |
| `toggle-item` | Checkbox/toggle button on each item |
| `remove-item` | Delete button on each item |
| `[data-testid="{item.name}"]` | The item container itself, keyed by item name |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `SQLITE_DB_LOCATION` | `src/persistence/todo.db` | Path to SQLite DB file |
| `MYSQL_HOST` | — | If set, switches persistence to MySQL |
| `NODE_ENV` | — | Set to `test` to suppress DB path logging in tests |
| `BASIC_AUTH_USER` | `admin` | Username for `/basic-auth` |
| `BASIC_AUTH_PASS` | `admin` | Password for `/basic-auth` |
| `SESSION_USER` | `admin` | Username for `/session` |
| `SESSION_PASS` | `admin` | Password for `/session` |
| `SESSION_SECRET` | `demo-session-secret` | HMAC secret for signing session cookies |
| `JWT_USER` | `admin` | Username for `/jwt` |
| `JWT_PASS` | `admin` | Password for `/jwt` |
| `JWT_SECRET` | `demo-jwt-secret` | HMAC secret for signing JWT tokens |

## Running tests

```bash
npm test
```

Tests use Jest with mocked persistence and UUID modules. Integration test for SQLite is in `spec/persistence/sqlite.spec.js`.
