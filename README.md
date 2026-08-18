<div align="center">

<img src="assets/icon/icon_app.svg" width="96" height="96" alt="Auto Renamer" />

# Auto Renamer

**Drop files into a folder. Watch them rename and number themselves.**

A crafted Electron desktop app that watches a folder and instantly renames every
file dropped into it — following a naming pattern you define, numbered in sequence,
extension untouched.

<br />

![Version](https://img.shields.io/badge/version-1.1.0-8ee5b3?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-e8ebf2?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-EN%20%2F%20فارسی-c0efd5?style=flat-square)

</div>

---

## Why

Renaming a batch of files by hand — `episode 1`, `episode 2`, `episode 3` — is the
kind of chore a computer should have eaten years ago. Auto Renamer turns it into a
single gesture: pick a folder, describe the name once, and every file you drop in
from then on names itself. No batch dialogs, no regex, no thinking.

## Highlights

- **Live folder watching** — files rename the instant they land, powered by [chokidar](https://github.com/paulmillr/chokidar).
- **Two numbering modes**
  - **Sequential** — `{x}` counts up, `{y}` stays fixed. Great for flat lists.
  - **Episode / Part** — `{y}` loops within an episode, `{x}` bumps after *N* parts: `ep 1 part 1` → `ep 1 part 2` → `ep 2 part 1` …
- **Zero-padding** — choose the width of each number (`1` → `007`).
- **Live preview + dry-run** — see the next six filenames before a single file exists.
- **Persistent counters** — survive restarts; reset in one click.
- **Collision-safe** — recognizes names it already made and advances past existing files instead of clobbering them.
- **Bilingual** — full **English / Persian** UI with proper **RTL** layout and a self-hosted Persian font.
- **A UI that earns its pixels** — frameless window, gooey metaball status orb, liquid toggle, floating tab bar, rename toasts, a cursor-following spotlight, and live session stats.

## Quick start

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm start
```

That's it — the app opens on the **Home** tab, ready to watch.

## Usage in 30 seconds

1. **Home** — click **Browse** to pick the folder to watch, tweak the naming pattern (tap the `{x}` / `{y}` chips to insert tokens), then flip the toggle on.
2. **Settings** — pick a numbering mode, set the current counters and zero-padding, and preview the next six filenames. Reset counters here anytime.
3. **Activity** — a running log of every rename, newest at the bottom.

Switch the whole interface between **English** and **فارسی** with the language button in the title bar. Your choice is remembered.

## Naming patterns

A pattern is any text with two optional tokens:

| Token | Meaning |
| :---: | ------- |
| `{x}` | Episode / primary counter — always advances |
| `{y}` | Part counter (loops in Episode/Part mode) or a fixed value (Sequential mode) |

**Example**

| Pattern | Padding | Result |
| ------- | :-----: | ------ |
| `film episode ({x}) part ({y})` | `2` | `film episode (01) part (01).mkv` |
| `EP{x}` | `3` | `EP007.mp4` |

The original file extension is always preserved.

## Building a portable `.exe`

```bash
npm run dist
```

The packaged executable lands in `dist/`.

## How it works

```
 ┌─────────────┐   file dropped    ┌──────────────┐   IPC    ┌────────────┐
 │  chokidar   │ ────────────────► │   main.js    │ ───────► │  renderer  │
 │  (watcher)  │                   │ rename logic │          │  live UI   │
 └─────────────┘                   └──────┬───────┘          └────────────┘
                                          │
                                   config.json (persisted)
```

- **main.js** — window lifecycle, the chokidar watcher, rename + counter logic, and config persistence.
- **preload.js** — a minimal `contextBridge` surface; the renderer never touches Node directly.
- **renderer.js / index.html / style.css** — the interface. Vanilla JS, no framework.
- **i18n.js** — the English/Persian string tables.

Settings persist to `config.json` in Electron's `userData` directory
(`%APPDATA%/auto-renamer/` on Windows).

## Tech

- **Electron 43** — `contextIsolation` on, `nodeIntegration` off.
- **chokidar** — cross-platform filesystem watching.
- **Vanilla HTML / CSS / JS** renderer — zero UI dependencies.
- **Self-hosted fonts**, fully offline — Cascadia Code, Space Grotesk, and Vazirmatn (Persian).

## License

Released under the [MIT License](LICENSE).

