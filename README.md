# GoBento

GoBento connects local businesses, charities and neighbours so surplus food gets
eaten instead of binned. Businesses publish discounted "surprise bags", customers
reserve and collect them, and charities can receive regular donations or arrange
pickups through the same app.

## Stack

- **SvelteKit 3 / Svelte 5** with runes, TypeScript and route groups
- **Tailwind CSS 4 + DaisyUI** for styling, with a small set of shared UI components
- **Drizzle ORM** on PostgreSQL; hand-authored SQL migrations in `drizzle/`
- **Paraglide** for translations (`en`, `de`, `fa`)
- **PWA** install prompt, service worker and link previews for shared offers and invites
- **Bun** for installs, scripts and tests

## Getting started

```sh
bun install
cp .env.example .env
bun run dev
```

The app starts on <http://localhost:3021>. With the default `.env` (`MOCK=true`
and an empty `DATABASE_URL`) it runs fully offline: an in-process demo database,
in-memory file storage, mocked payment providers and one-click demo sign-in as a
user, business, charity, moderator, admin or staff member.

For a real PostgreSQL database, set `DATABASE_URL` and apply the SQL files in
`drizzle/` in filename order. Fill in the remaining values in `.env` for the
features you want (OAuth, object storage, payments, notifications, mail, SSO).
Never commit `.env` or any other secret.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with hot reload |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run check` | Svelte and TypeScript diagnostics |
| `bun run test` | Vitest unit tests |
| `bun lint` | Built-in Bun linter (add `--fix` to apply fixes) |
| `bun fmt --check` | Check formatting; `bun fmt` applies it |
| `bun run db:snapshot` | Regenerate the mock database schema from the Drizzle schema |

There are no `lint`/`fmt` package scripts on purpose: `bun lint` and `bun fmt`
are built into Bun and run directly. Run `bun lint` and `bun fmt --check` before
opening a pull request.

## Project layout

```
src/
  routes/
    (public)/   sign-in, legal pages and public API endpoints
    (dock)/     the signed-in app: dashboard, offers, donations, team, admin…
    (authorized)/ payment callbacks and the onboarding flow
  lib/
    server/     database, auth, payments, notifications, PDF and XLSX generation
    components/ shared Svelte components, grouped by feature (see below)
    ...         domain helpers: navigation, statuses, dates, food types
  service-worker.js
drizzle/        SQL migrations
messages/       translation sources
project.inlang/ Paraglide configuration
docs/           migration notes and feature backlog
```

### Components

`src/lib/components/` is organised by feature:

- `ui/` — design-system primitives and feedback (buttons, cards, stat tiles, dialogs, toasts)
- `layout/` — the app shell and page-level helpers
- `account/`, `admin/`, `staff/` — account and back-office features
- `offers/`, `reservations/`, `charities/`, `donations/` — the marketplace flow
- `maps/`, `images/`, `motion/` — cross-cutting visual helpers

Import through the `#lib` alias, for example
`import Button from '#lib/components/ui/Button.svelte'`.

### Motion

Shared animation utilities live in `src/app.css` — `animate-pop-in`,
`animate-rise-in`, `animate-soft-pop`, the `stagger` delay helper, and small
accents like `attention-dot` and `hover-wiggle`. Use them sparingly for entrances
and feedback; `prefers-reduced-motion` collapses all animations and transitions
to a no-op.

### Roles and navigation

`src/lib/navigation.ts` is the single source of truth for which destinations each
account type sees. It is shared by the app shell and the post-sign-in redirect,
which keeps the phone tab bar, the desktop sidebar and the landing page in sync.
Account types are `user`, `business`, `charity`, `employee`, `moderator` and
`admin`.

### Data and mock mode

The Drizzle schema lives in `src/lib/server/schema.ts`. `src/lib/server/mock/`
provides a paged in-process database with stable demo ids and seed data, so the
whole app can be exercised without external services. Payment providers, file
storage and outbound HTTP calls are routed through the same mock layer when
`MOCK=true`.

## Documentation

- [docs/MIGRATION_TASKS.md](docs/MIGRATION_TASKS.md) — SvelteKit migration notes
- [docs/todo.md](docs/todo.md) — feature backlog and known gaps

## Deployment

`vercel.json` installs with Bun, builds with `bun run build` and schedules the
recurring-gift cron (`/api/cron/recurring-gifts`, 05:00 UTC daily). The web app
is deployed by connecting the repository to Vercel; pushes to the default branch
are built and published automatically. Configure the environment variables from
`.env.example` in the Vercel project settings. Nothing here needs server-side
SSH access.

Bot containers (the `bot/` folder) are deployed separately from the web app; see
the internal operations notes for those steps.

Contributor conventions for this repository are in [agents.md](agents.md).
