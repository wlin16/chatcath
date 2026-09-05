# ChatCath

A [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) profile for protein / biotech work:
a curated plugin set plus the compatibility patches they need on dsh 0.1.2. Same install shape as upstream.

## Install

Requirements: Node.js ≥ 22, pnpm ≥ 10 (`npm i -g pnpm`). macOS or Linux; Python 3 optional (two cosmetic patches skip without it).

```sh
git clone https://github.com/wlin16/chatcath.git
cd chatcath
pnpm install
pnpm dsh web
```

`pnpm dsh web` starts the Web UI on http://127.0.0.1:3080 and opens it in your browser (one-time login link is printed too).
Flags after `web` reach the app: `pnpm dsh web --port 8080`, `pnpm dsh web --no-open`.

There is no build step: every plugin ships prebuilt from npm, and the two in-repo plugins commit their `lib/`.

## What you get

- dsh 0.1.2-rc.1 core (`@deepseek-ai/dsh-base`, `dsh-web-app`) + 16 community plugins pinned to exact versions
  (market, better sidebar, codex-ui, task board, ssh-ops, skills manager, agency agents, archive manager, automation,
  IM connect, subscriptions, message edit, suggest-prompt, find-plugin …)
- In-repo plugins: `plugins/dsh-protein-cards` (protein structure cards) and `plugins/dsh-artifact-viewer`.
- `patches/` applied automatically on `pnpm install`:
  - patch 7 — Settings → General gets a "Restart DSH" row (中/英). Two clicks to confirm; the page reloads when the
    new process is up. The server restarts as a detached process; `pnpm dsh web` follows it, so Ctrl-C still stops it.
  - patch 10 — `@studyzy/dsh-suggest-prompt` 1.0.1 targets dsh 0.1.1; rewires three moved APIs so dsh 0.1.2 boots.
  - patch 8 — ssh-ops session-header tab gets `role="tab"` (fixes the floating tab, shows in the English UI). Needs Python 3.
  - patch 9 — ssh-ops: import a chosen list of hosts from `~/.ssh/config`. Needs Python 3.

## How it works

dsh boots profiles only from `$DSH_HOME/profiles/<name>`, so `scripts/dsh.mjs` links
`~/.dsh/profiles/chatcath` → this checkout on first run, then execs `dsh --profile chatcath …`.
Settings, credentials and sessions live in `~/.dsh` like a stock dsh install. Use `DSH_HOME=…` or
`CHATCATH_PROFILE=<name>` to change either.

The dsh core has peer dependencies a global `npm install` satisfies implicitly; pnpm does not, so they are
pinned under `dependencies` (see `chatcath.peerShims` in `package.json`). Bump them together with `@deepseek-ai/dsh`.

## Update

```sh
git pull && pnpm install && pnpm dsh web
```

## Add / remove plugins

Edit `dependencies` and `dsh.profile.bundles` in `package.json`, run `pnpm install`. The in-app plugin market also works
(it runs pnpm in this directory); commit the resulting `package.json` / `pnpm-lock.yaml` if you want to share the change.
