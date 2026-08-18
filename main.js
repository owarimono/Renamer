const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = {
  folder: '',
  pattern: 'film episode ({x}) part ({y})',
  mode: 'single',      // 'single' = x++ per file, y fixed | 'nested' = ep/part
  x: 1,                // live episode counter
  y: 1,                // live part counter (nested mode)
  fixedY: 1,           // single mode: fixed part value
  partsPerEp: 2,       // nested mode: parts before episode bumps
  xPad: 1,             // zero-pad width for {x}
  yPad: 1,             // zero-pad width for {y}
  lang: 'en'           // UI language: 'en' | 'fa'
};

let win = null;
let watcher = null;
let cfg = { ...DEFAULTS };
let sessionCount = 0;

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8'));
    // migrate legacy keys (counter/part) → new schema
    if (raw.counter !== undefined && raw.x === undefined) raw.x = raw.counter;
    if (raw.part !== undefined && raw.fixedY === undefined) raw.fixedY = raw.part;
    cfg = { ...DEFAULTS, ...raw };
  } catch {
    cfg = { ...DEFAULTS };
  }
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(cfg, null, 2), 'utf8');
}

const pad = (n, w) => String(n).padStart(Math.max(1, +w || 1), '0');

// Build a filename for a given x/y pair.
function buildName(x, y) {
  return cfg.pattern
    .replace(/\{x\}/g, pad(x, cfg.xPad))
    .replace(/\{y\}/g, pad(y, cfg.yPad));
}

// Advance counters after a successful rename, per mode.
function advance() {
  if (cfg.mode === 'nested') {
    cfg.y++;
    if (cfg.y > cfg.partsPerEp) { cfg.y = 1; cfg.x++; }
  } else {
    cfg.x++;
  }
}

// A file already produced by us — skip to avoid re-rename loop.
function isOurs(base) {
  const re = new RegExp('^' + cfg.pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{x\\\}/g, '\\d+')
    .replace(/\\\{y\\\}/g, '\\d+') + '$');
  return re.test(base);
}

function log(msg) {
  if (win) win.webContents.send('log', msg);
}

function stopWatch() {
  if (watcher) { watcher.close(); watcher = null; }
}

function startWatch() {
  stopWatch();
  if (!cfg.folder || !fs.existsSync(cfg.folder)) {
    log('Invalid folder: ' + cfg.folder);
    return false;
  }
  watcher = chokidar.watch(cfg.folder, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
  });
  watcher.on('add', onAdd);
  log('Watching: ' + cfg.folder);
  return true;
}

function onAdd(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  if (isOurs(base)) return;

  // find next free name, advancing counters through collisions
  let target;
  do {
    const y = cfg.mode === 'single' ? cfg.fixedY : cfg.y;
    target = path.join(dir, buildName(cfg.x, y) + ext);
    if (fs.existsSync(target)) advance();
    else break;
  } while (true);

  try {
    fs.renameSync(filePath, target);
    advance();
    saveConfig();
    sessionCount++;
    const from = path.basename(filePath);
    const to = path.basename(target);
    log('Renamed: ' + from + ' → ' + to);
    if (win) win.webContents.send('counter', { x: cfg.x, y: cfg.y, from, to, session: sessionCount });
  } catch (e) {
    log('Error renaming ' + path.basename(filePath) + ': ' + e.message);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 720,
    minWidth: 560,
    minHeight: 560,
    backgroundColor: '#17181c',
    icon: path.join(__dirname, 'build/icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopWatch();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-config', () => cfg);

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return cfg.folder;
  cfg.folder = r.filePaths[0];
  saveConfig();
  return cfg.folder;
});

ipcMain.handle('save-config', (_e, partial) => {
  const strKeys = ['pattern', 'mode', 'lang'];
  const numKeys = ['x', 'y', 'fixedY', 'partsPerEp', 'xPad', 'yPad'];
  for (const k of strKeys) if (typeof partial[k] === 'string') cfg[k] = partial[k];
  for (const k of numKeys) if (Number.isFinite(+partial[k]) && partial[k] !== '') cfg[k] = +partial[k];
  saveConfig();
  return cfg;
});

ipcMain.handle('start-watch', () => startWatch());
ipcMain.handle('stop-watch', () => { stopWatch(); log('Stopped.'); return true; });
ipcMain.handle('reset-counter', () => {
  cfg.x = 1; cfg.y = 1;
  saveConfig();
  return { x: cfg.x, y: cfg.y };
});

// Dry-run: preview the next N filenames without touching disk.
ipcMain.handle('preview-seq', (_e, n) => {
  let x = cfg.x, y = cfg.y, fy = cfg.fixedY;
  const out = [];
  const count = Math.min(Math.max(1, +n || 6), 20);
  for (let i = 0; i < count; i++) {
    const yy = cfg.mode === 'single' ? fy : y;
    out.push(buildName(x, yy));
    if (cfg.mode === 'nested') { y++; if (y > cfg.partsPerEp) { y = 1; x++; } }
    else x++;
  }
  return out;
});

ipcMain.on('win-min', () => win && win.minimize());
ipcMain.on('win-max', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('win-close', () => win && win.close());
