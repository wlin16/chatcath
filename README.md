# chatCATH

**chatCATH** is an AI research agent for protein science, built for members of the CATH group.
It reads and analyses structures, sequences and papers, runs tools in your workspace, and keeps every
result inside the conversation. It runs locally on your machine and opens in your browser.

## Install

Requirements: Node.js ≥ 22, pnpm ≥ 10 (`npm i -g pnpm`), git. macOS or Linux. Python 3 is optional
(two cosmetic patches are skipped without it).

```sh
git clone https://github.com/wlin16/chatcath.git
cd chatcath
pnpm install
pnpm start
```

`pnpm start` starts chatCATH on http://127.0.0.1:3080 and opens it in your browser (a one-time login link
is also printed). Flags are passed through: `pnpm start --port 8080`, `pnpm start --no-open`.
There is no build step.

On first launch, open **Settings → Models** to add your model provider and API key.

## Updating

**Settings → General → Check for updates** lists what is new; **Update now** installs it and restarts
chatCATH, and the page reloads by itself. The same pane has **Restart chatCATH**. Both follow the UI
language (中文 / English).

From a terminal, equivalently: `git pull && pnpm install && pnpm start`.
Updating refuses to run over uncommitted local changes — commit or stash them first.

## Layout

- `package.json` — the plugin set (pinned versions) and the profile bundle list.
- `plugins/chatcath-core` — branding, the update/restart rows and their local endpoints.
- `plugins/chatcath-protein-cards`, `plugins/chatcath-artifact-viewer` — protein structure cards and the artifact viewer.
- `patches/` — compatibility patches applied automatically on `pnpm install`.
- `scripts/start.mjs` — entry: links this checkout as profile `chatcath` (data lives in `~/.dsh`), then starts the service.

## Publishing an update (maintainers)

Edit, `pnpm install`, test with `pnpm start`, then `git push`. Members pick it up from **Check for updates**.
