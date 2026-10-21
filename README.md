# SocialBox — Unified Social Inbox (Frontend)

Next.js dashboard for the unified social inbox. All your social messages, one inbox: connect
channels, see conversations from every platform in one place, and reply from a shared team inbox.

The companion NestJS API + worker lives in a sibling repository (`socialbox-backend`) — this app
is a pure client against that API and has no server-side data layer of its own.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript, Tailwind CSS v4
- shadcn/ui — **note:** this install pulled the newer `base-nova` shadcn style, which is built
  on [Base UI](https://base-ui.com/) rather than Radix. If you add more shadcn components later,
  their APIs differ from the classic Radix-based ones you may be used to: use the `render` prop
  instead of `asChild` on triggers, wrap `DropdownMenuLabel`/grouped items in `DropdownMenuGroup`
  (Base UI's `Menu.GroupLabel` requires a `Menu.Group` ancestor), and `TooltipProvider` takes
  `delay`, not `delayDuration`.
- TanStack Query for all server state (no Redux/global client state store)
- Socket.IO client for realtime updates, bridged into the TanStack Query cache

## Local setup

Requires the backend API running (see `socialbox-backend/README.md` — Postgres/Redis via Docker,
API on `:3001`, worker running to actually process queued messages).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Opens on [http://localhost:3000](http://localhost:3000). Log in with the backend's seeded demo
account (`owner@demo.socialbox.local` / `password123`) or register a new one.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (default `http://localhost:3001`) |

## Architecture notes

- **Auth**: JWT access/refresh tokens in `localStorage` (see `lib/auth-storage.ts`) — simple and
  sufficient for this MVP, but readable by any script on the page. Moving to httpOnly cookies is
  the natural next step once the API and this app share a deployment domain.
- **Workspace context**: the active workspace id is also kept in `localStorage` and sent as the
  `X-Workspace-Id` header on every tenant-scoped request (`providers/workspace-provider.tsx`,
  `lib/api-client.ts`) — the backend is the actual source of truth for whether the current user
  may access that workspace; the frontend never assumes access.
- **Realtime**: `hooks/use-realtime.ts` opens one Socket.IO connection per active workspace and
  invalidates the relevant TanStack Query keys on `conversation.*`/`message.*`/`notification.*`
  events, rather than writing socket payloads directly into the cache — socket payloads carry the
  bare database row (no relations), so trusting them as cache values silently drops joined data
  like the conversation's contact.
- **Channel adapters**: the composer's available attachment types come from
  `GET /channels`'s `catalog[].capabilities`, which mirrors the backend's `ChannelAdapter`
  capabilities — the UI never hardcodes what a given platform can send.

## Known limitations

- No message search across content (only conversation/contact-level search) — matches the
  backend's current search scope.
- Contacts have a detail page (edit, notes, merge, their conversations), but no tags of their own — tags
  live on conversations.
- Workspace rename isn't wired up (no corresponding backend endpoint yet).

## Testing

Unit and component tests run with [Vitest](https://vitest.dev) and React Testing Library in a
simulated browser (jsdom):

```bash
npm test                # run everything once
npm run test:watch      # re-run on change
npm run test:coverage   # coverage summary + HTML report in ./coverage
```

What is covered (≈250 tests, ≈88% of lines):

- **Logic**: the API client (auth headers, token refresh coalescing, sign-out on a dead session),
  templates and placeholders, duration formatting, automation rule ↔ form conversion, view summaries,
  the presence / typing stores, the notification sound.
- **State and hooks**: inbox filters and saved views, presence heartbeat timing, realtime events →
  cache refreshes, the auth provider.
- **Components and pages**: composer (the `/` saved-reply picker, send rules, AI draft preview and undo),
  conversation list (select mode, shift-click ranges, bulk actions, "Load more"), customer panel,
  activity timeline, message bubbles (status ticks, sandboxed HTML email), sidebar views, analytics,
  automations, saved replies, contacts (edit and merge), team, channels, connect dialogs, login/register,
  workspace privacy switches, and the app shell.

Conventions: tests live next to the code in `__tests__/` folders; network calls are replaced by mocking
`@/lib/api-client` (so a test states exactly which request it expects); `test-utils/render.tsx` renders with a
fresh query cache that never retries. The tests deliberately assert behaviour a person would notice
(what is shown, what request is sent) rather than implementation details. The backend's own e2e suite
(`npm run test:e2e:docker` there) covers the API and cross-cutting rules such as workspace isolation.

Not covered: real-browser behaviour (layout, drag/scroll, actual audio, WebSockets) — a Playwright suite
over sign-in → workspace → inbox → send-a-message would be the next step.
