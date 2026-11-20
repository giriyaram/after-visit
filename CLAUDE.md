# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AfterVisit is a time-boxed follow-up chat between a clinic and a patient after an in-person visit. The spec in [docs/PRODUCT.md](docs/PRODUCT.md) is the source of truth for every feature.

## Stack

Next.js (App Router), TypeScript, React 19. Astryx is the only UI library, with StyleX for style overrides.

## Commands

- `npm run dev`: run the dev server
- `npm run build`: production build
- `npm run lint`: ESLint
- `npm test`: tests, run against the database in `.env.local`; each test rolls back what it writes

## Database

PostgreSQL (Neon) through Drizzle ORM with the `pg` driver. The schema is `lib/db/schema.ts`; migrations in `lib/db/migrations/` are generated, committed, and never edited by hand.

- Commands: `npm run db:generate` (new migration after a schema change), `npm run db:migrate` (apply migrations), `npm run db:seed` (reset the sample data; never in production).
- Naming: plural snake_case tables, snake_case columns, `uuid` ids, `<thing>_id` foreign keys, `timestamptz` times ending in `_at`. Use a nullable `_at` timestamp instead of a boolean.
- One clinic, no clinic management. Staff and follow-ups still carry `clinic_id`, and every staff query filters by it.
- No status column. A follow-up is open when `starts_at <= now() AND now() < ends_at AND closed_early_at IS NULL`, checked on the database clock in the same statement as the write.
- Patient link and patient session tokens are 32 random bytes, base64url. Store only the SHA-256 hex and look up by hashing the incoming token. Never store or log the raw token. The one exception is `staff_sessions.token`, which Better Auth stores as plain text.
- No chat messages, audit logs, soft deletes or analytics tables.

## Staff sign-in

Better Auth (`lib/auth.ts`), email and password only. Its "user" is the `staff` table. Patients never get accounts.

- Staff are created only by `npm run staff:create`. There is no sign-up, email verification, password reset or social login; those endpoints are disabled.
- `getCurrentStaff()` in `lib/current-staff.ts` is the protection. It checks the session in the database and returns the staff member's clinic and role. Every staff page, staff data function and staff server action calls it. `proxy.ts` and the staff layout are not the protection.
- Staff data functions read the clinic from `getCurrentStaff()` themselves. Never accept a clinic id as an argument or from a request.
- Doctors and reception can do the same things. The role is shown, not used for permissions.
- Sign-in posts to `/api/auth/sign-in/email`, not a server action, so the attempt limit applies.

## Follow-up lifecycle

The rules live in `lib/follow-ups/lifecycle.ts`, with tests beside it. Server actions (`lib/actions/follow-ups.ts` for staff, `app/(patient)/visit/[token]/actions.ts` for patients) only add the session check and the cookie.

- Staff lifecycle functions take the `CurrentStaff` object from `getCurrentStaff()`, never a bare clinic id. Another clinic's follow-up is reported as not found.
- A write that needs an open follow-up checks `isOpen` in the same `UPDATE`. Flag and close early need open; extend needs closed by time and not closed early; link regeneration and patient entry work in any state.
- Patient pages carry no patient details beyond the link token: the title is always "AfterVisit", and the chat page sends the browser only `PatientFollowUpView` (note, open or closed, end time) plus the clinic and staff display names.
- A patient sees only the clinic name and phone until they confirm the last 4 digits. That creates a `patient_sessions` row and a cookie limited to `/visit/<token>`. Patient data functions check that session themselves.
- Server action arguments are untrusted: type them `unknown` and validate.
- An action no screen imports has no endpoint, so it cannot be tested over HTTP until it is wired in.

## Chat (Nexconn)

Messages live in Nexconn, never in our database. The server side is `lib/chat/`. The browser side is `lib/chat/client.ts` (`useChatSession`: session, SDK init, connect) and `components/nexconn-chat-ui.tsx`, which mounts Nexconn's prebuilt Chat UI (`@nexconn/chatui`, Web Components) for the message list and composer. That is the one exception to the Astryx-only rule; everything around it (pinned note, banners, closed-state buttons) stays Astryx. Chat UI must be created before the SDK connects (`prepareChatUi` via `beforeConnect`), or it shows Disconnected and `openChannel` answers "not ready" forever. The inbox passes it too, because a conversation opened from the inbox reuses the inbox's connection. The staff inbox reads unread counts and latest messages through `useStaffUnread` (token from `POST /inbox/chat-session`) and sorts unread first in the browser; the staff conversation uses the same Chat UI component. There is no sample message data any more.

- One Nexconn group channel per follow-up. Ids are derived, not stored: channel `f<uuid hex>`, staff user `s<staff uuid hex>`, patient user `p<follow-up uuid hex>` (`lib/chat/ids.ts`).
- All Platform Chat API calls go through `NexconnServer` (`lib/chat/nexconn-server.ts`), built from env in `lib/chat/server.ts`. The App Secret is read there only. Lifecycle functions take a `NexconnServer` argument so tests pass `FakeNexconnServer`.
- `follow_ups.chat_channel_created_at` and `chat_patient_muted_at` record what Nexconn was told. `syncPatientGate` in `lib/chat/channel.ts` mutes the patient whenever the follow-up is not open on the database clock and unmutes when it is. It runs after close early and extend, and on every token issue. At `ends_at` the chat sweeper (`lib/chat/sweeper.ts`, started by `instrumentation.ts`) mutes it with nobody watching: it sleeps until the next open follow-up ends and runs `muteEndedWindows`, which also retries mutes that failed. It needs a long-running server (`next dev`, `next start`); a serverless host would need a scheduler calling `muteEndedWindows` instead.
- Patients are muted in all direct channels on every token issue, before the token (`muteInDirectChannels`). Regenerating the link revokes the old link's chat access after the commit (`revokePatientChat`: expire the patient's tokens, then drop live connections with a ban that is lifted at once); `isChatRevoked: false` means Nexconn was unreachable and regenerating again retries.
- Not enforceable through the server API, so still open: a patient can create their own group with staff and send there, and can recall their own messages after close. Only Nexconn's pre-messaging webhook can block these (it needs a public URL, console setup, and fails open after three timeouts). No AfterVisit screen shows those side groups.
- The end of the window reaches open screens through `useFollowUpWindow` (`lib/chat/client.ts`): it polls `GET /visit/<token>/chat-state` or `GET /inbox/<id>/chat-state` every 15 seconds, on tab focus, and flips to closed at `ends_at` on the server's clock. Those state routes run the gate, so polling is also what mutes the patient. Extend refreshes the state and the same channel reopens.
- Outside production the new follow-up form offers a 2-minute window (`DEV_WINDOW_VALUE` in `lib/follow-ups/input.ts`) for watching a window end. It is stored as a 3-day follow-up whose `ends_at` is 2 minutes out; the server refuses it in production.
- Tokens come only from `POST /inbox/<id>/chat-session` (staff, own clinic, any state) and `POST /visit/<token>/chat-session` (patient, needs the session cookie, any state). They are issued per request and never stored or logged. Route handlers use `findCurrentStaff()` to answer 401; pages and actions keep using `getCurrentStaff()`.
- `npm run staff:create` joins the new member to every open follow-up's channel. The console setting "Enable pre-join history access by new member" must be on for Group channels.

## Astryx rules

The Next.js and Astryx agent notes are imported below and apply as written, except where these rules differ; these rules win.

- Call the CLI as `npx @astryxdesign/cli <cmd>`, never `npx astryx`. The unscoped `astryx` is a different npm package.
- Before building UI, run `npx @astryxdesign/cli search "<query>"` to find what exists and `npx @astryxdesign/cli component <Name>` to read its props.
- Import each component from its own path, e.g. `@astryxdesign/core/Button`.
- This project has the StyleX compiler, so ignore the imported note that says there is none. Style overrides go through the `xstyle` prop with `stylex.create()`, after component props and tokens.
- No Tailwind and no other component library.

@AGENTS.md
