# Reliability Index

The web and mobile apps for inspecting Reliability Index scores, in one
repository.

| Folder | What it is |
|---|---|
| [apps/web](apps/web) | Reliability Index Explorer, the analyst dashboard (React, Vite) |
| [apps/mobile](apps/mobile) | The mobile app (Expo, React Native) |
| [packages/core](packages/core) | Code shared by both apps (`@reliability-index/core`) |

Each app's README explains what it does and how it works.

## Getting started

You need Node 20 or newer and Yarn classic (version 1).

```bash
yarn install       # installs both apps
yarn web           # start the web app
yarn mobile        # start the mobile app with Expo
yarn run check     # typecheck, lint and test both apps
```

Run `yarn install` from this folder, not from inside an app. There is one
`yarn.lock`, here at the top.

Yarn 1 has its own built-in `yarn check` command, so the project scripts have
to be called with `yarn run check`, both here and inside each app.

GitHub runs `yarn run check` on every pull request to `main` and every push to
`main`, then builds the web app and bundles the mobile app for iOS and Android
(`.github/workflows/check.yml`). It does not run `expo-doctor`, because two of
its checks depend on Expo's servers and sometimes fail for no reason.

## How the workspace is set up

- The apps are Yarn workspaces, listed in the top `package.json`.
- The web app's packages are installed inside `apps/web/node_modules` and not
  shared (`nohoist` in the top `package.json`). Sharing them put two copies of
  Vite side by side, and the types stopped matching.
- The mobile app's packages are installed in the top `node_modules`, which is
  the layout Expo expects. Expo finds the workspace by itself, so there is no
  `metro.config.js`.
- Both apps use React 19.3.0.
- Shared code is in `packages/core`. The apps import it by file, for example
  `@reliability-index/core/api/schemas`. It is TypeScript source with no build
  step: Vite and Metro compile it along with each app. It owns the `zod`
  dependency for both apps. So far it holds:
  - `api`: the API schemas and client. Each app passes its own settings to the
    client, such as which host to call.
  - `scoring`: the scoring window dates, the score band limits and reading the
    points off a score reason.
  - `live`: which live updates to apply.

## History

The two apps used to be separate repositories. Their full history is kept
here, and their old pull requests can still be read in the archived
repositories:

- `MichaelAmoabengVaulitions/reliability-index-explorer` (web)
- `MichaelAmoabengVaulitions/reliability-index-mobile` (mobile)
