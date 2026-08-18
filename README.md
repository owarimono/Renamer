# Auto Renamer

A polished Windows desktop app that watches a folder and automatically renames + sequentially numbers any file dropped into it. Built with Electron.

![Electron](https://img.shields.io/badge/Electron-43-47848F?logo=electron&logoColor=white)

## What it does

Point it at a folder, define a naming pattern like `film episode ({x}) part ({y})`, and hit watch. Every file copied into that folder is instantly renamed to the next number in the sequence — original extension preserved, counter persisted across restarts.

## Features

- **Live folder watching** — drops are renamed the moment they land (via [chokidar](https://github.com/paulmillr/chokidar)).
- **Two numbering modes**
  - *Sequential* — `{x}` counts up, `{y}` stays fixed.
  - *Episode / Part* — `{y}` loops per episode, `{x}` bumps after N parts (e.g. `ep 1 part 1`, `ep 1 part 2`, `ep 2 part 1`, …).
- **Zero-padding** — set the width of each number (`1` → `01`).
- **Live preview & dry-run sequence** — see the next filenames before any file exists.
- **Persistent counters** — survive app restarts; reset any time.
- **Collision-safe** — skips names it already produced, advances past existing files.
- **Crafted UI** — frameless window, gooey metaball status orb, liquid toggle, floating tab bar, rename toasts, cursor spotlight, and session stats.

## Install & run

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm start
```

## Build a portable .exe

```bash
npm run dist
```

Output lands in `dist/`.

## How to use

1. **Home** — pick the watched folder, set the naming pattern (click the `{x}` / `{y}` chips to insert tokens), toggle watching on.
2. **Settings** — choose numbering mode, current counters, zero-padding, and preview the next 6 filenames. Reset counters here.
3. **Activity** — a live log of every rename.

## Pattern tokens

| Token | Meaning |
|-------|---------|
| `{x}` | Episode / primary counter |
| `{y}` | Part counter (or fixed value in Sequential mode) |

Example: pattern `film episode ({x}) part ({y})` with padding `2` → `film episode (01) part (01).mkv`.

## Configuration

Settings persist to `config.json` in Electron's `userData` directory
(`%APPDATA%/auto-renamer/` on Windows).

## Tech

- Electron (main + preload + renderer, `contextIsolation` on, `nodeIntegration` off)
- chokidar for filesystem watching
- Vanilla HTML/CSS/JS renderer — no framework
- Offline self-hosted fonts (Cascadia Code, Space Grotesk)

## License

MIT
