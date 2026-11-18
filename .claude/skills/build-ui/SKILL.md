---
name: build-ui
description: Build or change an AfterVisit screen with Astryx.
argument-hint: <feature request>
---

# Build UI

Build or change an AfterVisit screen. Follow these steps in order.

Feature request: $ARGUMENTS

## 1. Read the spec and the request

Read `docs/PRODUCT.md` and the feature request above. The spec is the source of truth; if the request conflicts with it, say so before building.

## 2. Find what Astryx has

- Run `npx @astryxdesign/cli search "<query>"` for each UI need.
- Run `npx @astryxdesign/cli component <Name> --props` before using a component.
- Run `npx @astryxdesign/cli template --list` to check for a starting point.

Always call the CLI as `npx @astryxdesign/cli`, never `npx astryx`.

## 3. Use Astryx only

- Use Astryx components and theme tokens only.
- Overrides go through the `xstyle` prop with `stylex.create()`.
- No raw hex colours, no Tailwind, no new UI dependencies.

## 4. When Astryx lacks something

Say so, and propose the smallest custom component that fills the gap. Never invent props: use only the props the CLI shows.

## 5. Reuse before creating

Check the existing layouts and components in `app/` and `components/` first. Create a new one only when nothing existing fits.

## 6. Cover every state

Each screen handles loading, empty, error and success.

## 7. Screen sizes

- Patient screens are mobile-first at 380px wide and keep the "Not for emergencies" banner.
- Staff screens work at 1280px wide.

## 8. Keep data on the server

Data access and permission checks stay on the server. Client components receive only the data they display.

## 9. Finish

Run `npm run build`. Then list:

- what changed, by file
- what the user should check by eye
