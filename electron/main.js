/**
 * WealthyMindsets Pro — Electron Main Process
 *
 * Wraps the Next.js app in a native desktop window.
 * Build with: npm run electron:build
 */

const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const { spawn }  = require("child_process");

// ── Environment ─────────────────────────────────────────────
const isDev  = process.env.NODE_ENV === "development" || !app.isPackaged;
const PORT   = process.env.PORT || 3000;
const BASE_URL = isDev ? `http://localhost:${PORT}` : `http://localhost:${PORT}`;

let mainWindow = null;
let nextProcess = null;

// ── Force dark mode ──────────────────────────────────────────
nativeTheme.themeSource = "dark";

// ── Create window ────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:          1440,
    height:         900,
    minWidth:       1024,
    minHeight:      640,
    backgroundColor: "#070A0F",
    titleBarStyle:  "hiddenInset",     // macOS: traffic lights in frame
    frame:          process.platform !== "darwin",
    title:          "WealthyMindsets Pro",
    icon:           path.join(__dirname, "../public/icons/icon-512x512.png"),
    webPreferences: {
      preload:            path.join(__dirname, "preload.js"),
      contextIsolation:   true,
      nodeIntegration:    false,
      webSecurity:        true,
      allowRunningInsecureContent: false,
    },
  });

  // ── Load the app ───────────────────────────────────────────
  mainWindow.loadURL(BASE_URL).catch(() => {
    // Retry once after 2s if Next.js server isn't ready
    setTimeout(() => mainWindow?.loadURL(BASE_URL), 2000);
  });

  // ── Dev tools ─────────────────────────────────────────────
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // ── Window controls ────────────────────────────────────────
  mainWindow.on("closed", () => { mainWindow = null; });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── Custom menu ──────────────────────────────────────────────
function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Chart",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.loadURL(`${BASE_URL}/charts`),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ type: "separator" }, { role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Navigate",
      submenu: [
        { label: "Charts",    click: () => mainWindow?.loadURL(`${BASE_URL}/charts`) },
        { label: "Scanner",   click: () => mainWindow?.loadURL(`${BASE_URL}/scanner`) },
        { label: "Heat Maps", click: () => mainWindow?.loadURL(`${BASE_URL}/heatmaps`) },
        { label: "News",      click: () => mainWindow?.loadURL(`${BASE_URL}/news`) },
        { label: "Education", click: () => mainWindow?.loadURL(`${BASE_URL}/education`) },
        { label: "The Lounge",click: () => mainWindow?.loadURL(`${BASE_URL}/lounge`) },
        { label: "Shop",      click: () => mainWindow?.loadURL(`${BASE_URL}/shop`) },
        { label: "Profile",   click: () => mainWindow?.loadURL(`${BASE_URL}/profile`) },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(process.platform === "darwin" ? [
          { type: "separator" },
          { role: "front" },
        ] : [{ role: "close" }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();

  if (isDev) {
    // In dev, Next.js dev server must be running separately
    createWindow();
  } else {
    // In production, spin up the built Next.js server
    const serverPath = path.join(process.resourcesPath, "app", "server.js");
    nextProcess = spawn("node", [serverPath], {
      env:   { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
      stdio: "pipe",
    });
    nextProcess.stdout.on("data", (d) => {
      if (d.toString().includes("Ready")) createWindow();
    });
    nextProcess.stderr.on("data", (d) => console.error("[Next]", d.toString()));
    // Fallback: open window after 4s even if ready signal missed
    setTimeout(() => { if (!mainWindow) createWindow(); }, 4000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    nextProcess?.kill();
    app.quit();
  }
});

app.on("before-quit", () => nextProcess?.kill());

// ── IPC handlers ─────────────────────────────────────────────
ipcMain.handle("app-version", () => app.getVersion());
ipcMain.handle("platform",    () => process.platform);
