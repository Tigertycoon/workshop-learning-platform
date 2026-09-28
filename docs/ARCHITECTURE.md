# Architecture and development

## Application boundary

Vite serves the React frontend during development and proxies `/api`, `/uploads`, `/screenshots` and `/games` to Express. After a frontend build, Express serves `app/client/dist` directly. `npm start` uses `tsx`, so server development dependencies are required at runtime in this local setup.

SQLite is initialized on startup. WAL mode supports concurrent reads; writes run in the single server process. This trades operational simplicity for limited scaling. Account creation always grants the learner role (`kind`). Authenticated requests verify HS256 tokens and retrieve the current role from the database, rather than trusting a role that might have changed since sign-in.

The API field `pin` and database column `pin_hash` are internal compatibility names; users enter passwords. New passwords must be at least eight characters and no more than 72 UTF-8 bytes. Tokens expire after eight hours.

## API areas

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Registration, login, current account and group membership |
| `/api/chapters`, `/api/progress` | Lessons and learner progress |
| `/api/activities` | Exercises, submissions and unlock status |
| `/api/admin` | Groups, members and task overrides |
| `/api/admin/content` | Lesson editing, instructor media and progress export |
| `/api/admin/review` | Submission queue and feedback |
| `/api/games` | Optional local game metadata |
| `/api/health` | Process health |

Instructor routes require the current `admin` role. JSON bodies are limited to 256 KiB. CSV cells escape quotes and prefix potential spreadsheet formulas with an apostrophe. Related lesson deletions and replacement of steps/criteria are transactional.

## Environment

Setup creates `app/.env` once; explicit process environment variables take precedence. Refer to [`app/.env.example`](../app/.env.example).

| Variable | Meaning |
| --- | --- |
| `JWT_SECRET` | Required generated signing secret, at least 32 characters |
| `HOST` | Defaults to loopback `127.0.0.1` |
| `PORT` | Defaults to `3001` |
| `DATABASE_PATH` | Defaults to `server/workshop.db`, relative to `app` |
| `MEDIA_ROOT` | Defaults to `app`; an absolute path is also accepted |
| `DEMO_ADMIN_PASSWORD`, `DEMO_STUDENT_PASSWORD` | Passwords for the initial synthetic demo only |

If `PORT` changes, set `VITE_API_PROXY_TARGET` in the environment that starts Vite to the matching URL. Changing a demo password variable does not reset an existing account. For a separate demo, choose a new `DATABASE_PATH` instead of deleting an existing database.

Node 22 is the tested runtime. The SQLite dependency uses a native module; platforms without an available prebuilt binary may require native compilation tools.

## Optional games and media

Add only trusted, non-confidential content that you may use and redistribute. A game directory must contain `index.html` directly under `MEDIA_ROOT/games/<game-name>/`. Optional thumbnails go in `MEDIA_ROOT/Screenshots` with a matching name. Run:

```sh
npm --prefix app/server run seed:games
```

This registers local builds in the game catalog. Compressed `.gz`/`.br` WebGL assets receive encoding headers. No Unity build is included or validated here. Game scripts share the server origin: only trusted builds belong here.

Static media directories are publicly readable from the local server. Instructor uploads allow PNG, JPG, GIF, WebP, MP4 and WebM extensions up to 20 MiB, with generated stored filenames and no HTML/SVG uploads. File signatures and malware are not inspected.

The demo requires none of these optional files. Git ignores all runtime media directories and the publication check rejects them if they are accidentally staged.
