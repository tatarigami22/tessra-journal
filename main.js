const { app, BrowserWindow, ipcMain, shell, Menu, dialog, clipboard, nativeImage, Tray } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
// One-time move of data from the app's previous name (Edge Journal)
try {
  const OLD_DIR = path.join(app.getPath('appData'), 'Edge Journal', 'data');
  if (!fs.existsSync(path.join(DATA_DIR, 'journal.json')) && fs.existsSync(path.join(OLD_DIR, 'journal.json'))) fs.cpSync(OLD_DIR, DATA_DIR, { recursive: true });
} catch (e) { console.error('migration failed', e); }
const IMG_DIR = path.join(DATA_DIR, 'screenshots');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DATA_FILE = path.join(DATA_DIR, 'journal.json');

for (const d of [DATA_DIR, IMG_DIR, BACKUP_DIR]) fs.mkdirSync(d, { recursive: true });

function dailyBackup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `journal-${stamp}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(DATA_FILE, target);
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort();
    while (files.length > 30) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  } catch (e) { console.error('backup failed', e); }
}

ipcMain.handle('data:load', () => {
  dailyBackup();
  return fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : null;
});

ipcMain.handle('data:save', (_e, json) => {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, DATA_FILE);
  return true;
});

ipcMain.handle('img:save', (_e, id, dataUrl) => {
  const m = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('bad image');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = path.join(IMG_DIR, `${id}.${ext}`);
  fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
  return `${id}.${ext}`;
});

ipcMain.handle('img:read', (_e, name) => {
  const file = path.join(IMG_DIR, path.basename(name));
  if (!fs.existsSync(file)) return null;
  const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(file).toString('base64');
});

ipcMain.handle('img:delete', (_e, name) => {
  const file = path.join(IMG_DIR, path.basename(name));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return true;
});

const REPO = 'tatarigami22/tessra-journal';
const newer = (a, b) => { const x = String(a).replace(/^v/, '').split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
/* ---------- updates: check GitHub, then download, install and restart ---------- */
let latestRelease = null, updating = false;
function updateAsset(rel) {
  const a = (rel && rel.assets) || [];
  if (process.platform === 'darwin') { const arch = process.arch === 'arm64' ? 'arm64' : 'x64'; return a.find(x => x.name.endsWith(`-mac-${arch}.zip`)) || null; }
  if (process.platform === 'win32') return a.find(x => /^Tessra-Setup-.*\.exe$/.test(x.name)) || null;
  return null;
}
function macAppPath() { const p = path.resolve(process.execPath, '..', '..', '..'); return p.endsWith('.app') ? p : null; }
function autoUpdateProblem() {
  if (!app.isPackaged) return 'running from source';
  if (process.platform === 'darwin') {
    const p = macAppPath();
    if (!p) return 'app bundle not found';
    if (p.includes('/AppTranslocation/') || p.startsWith('/Volumes/')) return 'move Tessra into your Applications folder first';
    try { fs.accessSync(path.dirname(p), fs.constants.W_OK); } catch (e) { return 'no permission to replace the app'; }
    return null;
  }
  if (process.platform === 'win32') return null;
  return 'not supported on this system';
}
ipcMain.handle('app:checkUpdate', async () => {
  try {
    const { net } = require('electron');
    const r = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'Tessra', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!newer(j.tag_name, app.getVersion())) return null;
    latestRelease = j;
    const problem = updateAsset(j) ? autoUpdateProblem() : 'no installer for this computer in the release';
    return { version: String(j.tag_name).replace(/^v/, ''), url: j.html_url, canAuto: !problem, why: problem || '' };
  } catch (e) { return null; }
});
function startDetached(cmd, args) {
  const { spawn } = require('child_process');
  return new Promise((res, rej) => {
    const c = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    c.once('error', rej); c.once('spawn', () => { c.unref(); res(); });
  });
}
async function downloadTo(url, file, expected, onProgress) {
  const { net } = require('electron');
  const r = await net.fetch(url, { headers: { 'User-Agent': 'Tessra' } });
  if (!r.ok) throw new Error('download failed (' + r.status + ')');
  const total = Number(r.headers.get('content-length')) || expected || 0;
  const out = fs.createWriteStream(file); const reader = r.body.getReader(); let got = 0, last = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    if (!out.write(Buffer.from(value))) await new Promise(res => out.once('drain', res));
    got += value.length;
    if (total && Date.now() - last > 120) { last = Date.now(); onProgress(got / total); }
  }
  await new Promise((res, rej) => { out.on('error', rej); out.end(res); });
  if (expected && fs.statSync(file).size !== expected) throw new Error('download was incomplete, please try again');
  onProgress(1);
}
ipcMain.handle('update:install', async e => {
  if (updating) return { ok: false, error: 'already updating' };
  const send = (stage, p) => { try { e.sender.send('update:progress', { stage, p }); } catch (_) {} };
  try {
    updating = true;
    const problem = autoUpdateProblem(); if (problem) throw new Error(problem);
    const asset = updateAsset(latestRelease); if (!asset) throw new Error('no installer for this computer in the release');
    const dir = fs.mkdtempSync(path.join(app.getPath('temp'), 'tessra-update-'));
    const file = path.join(dir, asset.name);
    await downloadTo(asset.browser_download_url, file, asset.size, p => send('download', p));
    send('install', 0);
    const { execFileSync } = require('child_process');
    if (process.platform === 'darwin') {
      const target = macAppPath(), x = path.join(dir, 'x');
      fs.mkdirSync(x);
      execFileSync('/usr/bin/ditto', ['-x', '-k', file, x]);
      const found = fs.readdirSync(x).find(n => n.endsWith('.app'));
      if (!found) throw new Error('update package was empty');
      const script = path.join(dir, 'install.sh');
      fs.writeFileSync(script, [
        '#!/bin/bash',
        'PID="$1"; APP="$2"; NEW="$3"',
        'for i in $(seq 1 120); do kill -0 "$PID" 2>/dev/null || break; sleep 0.5; done',
        'rm -rf "$APP.old"',
        'if mv "$APP" "$APP.old" && /usr/bin/ditto "$NEW" "$APP"; then rm -rf "$APP.old"; else rm -rf "$APP"; mv "$APP.old" "$APP"; fi',
        '/usr/bin/xattr -dr com.apple.quarantine "$APP" 2>/dev/null',
        'open "$APP"'
      ].join('\n'));
      await startDetached('/bin/bash', [script, String(process.pid), target, path.join(x, found)]);
    } else {
      await startDetached(file, ['/S', '--force-run']);
    }
    setTimeout(() => app.quit(), 600);
    return { ok: true };
  } catch (err) {
    updating = false;
    try { fs.appendFileSync(path.join(DATA_DIR, 'update-errors.log'), `${new Date().toISOString()} ${app.getVersion()} ${err && err.stack || err}\n`); } catch (_) {}
    return { ok: false, error: String(err && err.message || err), url: latestRelease && latestRelease.html_url };
  }
});
ipcMain.handle('app:openUrl', (e, url) => { if (/^https:\/\/github\.com\//.test(url)) shell.openExternal(url); });
ipcMain.handle('app:info', () => ({ dataDir: DATA_DIR, imgDir: IMG_DIR, version: app.getVersion() }));
ipcMain.handle('app:openData', () => shell.openPath(DATA_DIR));

ipcMain.handle('file:saveAs', async (e, defaultName, content) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), defaultName) });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, content, 'utf8');
  return r.filePath;
});

function shareLog(what, err) {
  try { fs.appendFileSync(path.join(DATA_DIR, 'share-errors.log'), `${new Date().toISOString()} ${process.platform} ${app.getVersion()} ${what}: ${err && err.stack || err}\n`); } catch (e) {}
}
function uniqueDownload(name) {
  const dir = app.getPath('downloads'), ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name), i = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${base}-${i++}${ext}`);
  return p;
}
ipcMain.handle('file:saveBinary', async (e, defaultName, b64) => {
  const buf = Buffer.from(b64, 'base64');
  let r;
  try {
    const win = BrowserWindow.fromWebContents(e.sender);
    r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('downloads'), path.basename(defaultName)) });
  } catch (err) {
    shareLog('save dialog', err);
    const p = uniqueDownload(path.basename(defaultName)); fs.writeFileSync(p, buf); return p;
  }
  if (r.canceled || !r.filePath) return false;
  try { fs.writeFileSync(r.filePath, buf); return r.filePath; }
  catch (err) { shareLog('save write', err); const p = uniqueDownload(path.basename(defaultName)); fs.writeFileSync(p, buf); return p; }
});

ipcMain.handle('clip:image', (_e, dataUrl) => {
  const img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) { shareLog('clipboard', 'empty image'); throw new Error('the card image came out empty'); }
  try { clipboard.writeImage(img); } catch (err) { shareLog('clipboard', err); throw err; }
  return true;
});

ipcMain.handle('share:file', (e, name, b64) => {
  const dir = path.join(os.tmpdir(), 'tessra-share');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) { try { fs.unlinkSync(path.join(dir, f)); } catch (err) {} }
  const file = path.join(dir, path.basename(name));
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  if (process.platform !== 'darwin') { shell.showItemInFolder(file); return 'folder'; }
  try {
    const { ShareMenu } = require('electron');
    const win = BrowserWindow.fromWebContents(e.sender);
    new ShareMenu({ filePaths: [file] }).popup({ window: win });
    return 'menu';
  } catch (err) {
    shareLog('share menu', err);
    shell.showItemInFolder(file); return 'folder';
  }
});

ipcMain.handle('pdf:save', async (e, defaultName, html) => {
  const parent = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showSaveDialog(parent, { defaultPath: path.join(app.getPath('documents'), defaultName), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return false;
  const w = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  try {
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await w.webContents.printToPDF({ printBackground: true, pageSize: 'Letter', margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } });
    fs.writeFileSync(r.filePath, pdf);
  } finally { w.destroy(); }
  return r.filePath;
});

const ICON = path.join(__dirname, 'build', 'icon.png');

/* ---------- menu bar / system tray ---------- */
let tray = null, lastTray = null;
function mainWindow() { return BrowserWindow.getAllWindows()[0] || createWindow(); }
function showWindow() { const w = mainWindow(); if (w.isMinimized()) w.restore(); w.show(); w.focus(); return w; }
function buildTray(p) {
  if (!p || !p.enabled) { if (tray) { tray.destroy(); tray = null; } return; }
  if (!tray) {
    const file = path.join(__dirname, 'build', process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png');
    const img = nativeImage.createFromPath(file);
    if (process.platform === 'darwin') img.setTemplateImage(true);
    tray = new Tray(img);
    if (process.platform !== 'darwin') tray.on('click', () => showWindow());
  }
  if (process.platform === 'darwin') tray.setTitle(p.title ? ' ' + p.title : '', { fontType: 'monospacedDigit' });
  tray.setToolTip(p.tooltip || 'Tessra');
  tray.setContextMenu(Menu.buildFromTemplate([
    ...(p.lines || []).map(l => ({ label: String(l), enabled: false })),
    { type: 'separator' },
    { label: 'New trade', click: () => { const w = showWindow(); w.webContents.send('tray:newTrade'); } },
    { label: 'Open Tessra', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Quit Tessra', role: 'quit' }
  ]));
}
ipcMain.handle('tray:update', (e, p) => { lastTray = p; try { buildTray(p); } catch (err) { console.error('tray', err); } });

function createWindow() {
  if (process.platform === 'darwin' && !app.isPackaged && app.dock && fs.existsSync(ICON)) app.dock.setIcon(ICON);
  const win = new BrowserWindow({
    icon: fs.existsSync(ICON) ? ICON : undefined,
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 700,
    title: 'Tessra',
    backgroundColor: '#0a0c0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:\/\//.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  return win;
}

const isMac = process.platform === 'darwin';
Menu.setApplicationMenu(Menu.buildFromTemplate([
  ...(isMac ? [{ role: 'appMenu' }] : []),
  { role: 'fileMenu' },
  { role: 'editMenu' },
  { role: 'viewMenu' },
  { role: 'windowMenu' }
]));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
