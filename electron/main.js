const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("node:path");
const { importKeynoteDeck } = require("./keynote-importer");

let mainWindow = null;
let presenterWindow = null;
let pendingUpdateInfo = null;
let autoUpdater = null;
let mainWindowEnsureTimer = null;

function updatesEnabled() {
  return app.isPackaged && process.env.MINDEX_DISABLE_UPDATES !== "1";
}

function appRoot() {
  return app.getAppPath();
}

function indexPath() {
  return path.join(appRoot(), "index.html");
}

function isMainWindowReloadShortcut(input = {}) {
  if (input.type !== "keyDown") return false;
  const key = String(input.key || "").toLowerCase();
  if (process.platform === "darwin") return input.meta && key === "r";
  return key === "f5" || (input.control && key === "r");
}

function bindMainWindowReloadShortcut(window) {
  window.webContents.on("before-input-event", (event, input) => {
    if (!isMainWindowReloadShortcut(input)) return;
    event.preventDefault();
    if (input.shift) window.webContents.reloadIgnoringCache();
    else window.webContents.reload();
  });
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 720,
    title: "Mindex",
    backgroundColor: "#11130f",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  bindMainWindowReloadShortcut(mainWindow);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.once("did-finish-load", () => {
    if (!mainWindow?.isVisible()) mainWindow.show();
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Mindex main window failed to load", { errorCode, errorDescription, validatedURL });
    if (!mainWindow?.isVisible()) mainWindow.show();
  });
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 1500);
  mainWindow.on("closed", () => {
    mainWindow = null;
    if (presenterWindow && !presenterWindow.isDestroyed()) presenterWindow.close();
  });

  mainWindow.loadFile(indexPath());
  return mainWindow;
}

function ensureMainWindowVisible() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function displayForPresenter(targetRect = null) {
  const displays = screen.getAllDisplays();
  if (targetRect) {
    const targetX = Number(targetRect.left) || 0;
    const targetY = Number(targetRect.top) || 0;
    const matched = displays.find((display) => {
      const bounds = display.bounds;
      return targetX >= bounds.x
        && targetX < bounds.x + bounds.width
        && targetY >= bounds.y
        && targetY < bounds.y + bounds.height;
    });
    if (matched) return matched;
  }
  return displays.find((display) => !display.internal) || displays.find((display) => display.id !== screen.getPrimaryDisplay().id) || screen.getPrimaryDisplay();
}

function createPresenterWindow({ url, targetRect } = {}) {
  const targetDisplay = displayForPresenter(targetRect);
  const { x, y, width, height } = targetDisplay.bounds;

  if (presenterWindow && !presenterWindow.isDestroyed()) {
    presenterWindow.focus();
    return;
  }

  presenterWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    show: false,
    backgroundColor: "#00ff00",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  presenterWindow.once("ready-to-show", () => {
    presenterWindow.setFullScreen(true);
    presenterWindow.show();
    presenterWindow.focus();
  });
  presenterWindow.on("closed", () => {
    presenterWindow = null;
  });

  if (url) {
    presenterWindow.loadURL(url);
  } else {
    presenterWindow.loadFile(indexPath(), { query: { output: "presenter", fullscreen: "1" } });
  }
}

function configureAutoUpdater() {
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    console.warn("Mindex updater unavailable", error?.message || error);
    return;
  }
  autoUpdater.autoDownload = false;
  autoUpdater.on("update-available", (info) => {
    pendingUpdateInfo = info;
    mainWindow?.webContents.send("mindex:update-available", info);
  });
  autoUpdater.on("update-not-available", (info) => {
    mainWindow?.webContents.send("mindex:update-not-available", info);
  });
  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("mindex:update-progress", progress);
  });
  autoUpdater.on("update-downloaded", (info) => {
    pendingUpdateInfo = info;
    mainWindow?.webContents.send("mindex:update-downloaded", info);
  });
  autoUpdater.on("error", (error) => {
    mainWindow?.webContents.send("mindex:update-error", {
      message: error?.message || "Update check failed.",
    });
  });
}

ipcMain.handle("mindex:open-presenter", (_event, payload = {}) => {
  createPresenterWindow(payload);
  return { ok: true };
});

ipcMain.handle("mindex:close-presenter", () => {
  if (presenterWindow && !presenterWindow.isDestroyed()) presenterWindow.close();
  presenterWindow = null;
  return { ok: true };
});

ipcMain.handle("mindex:fullscreen-presenter", () => {
  if (!presenterWindow || presenterWindow.isDestroyed()) return { ok: false, reason: "presenter-window-unavailable" };
  presenterWindow.setFullScreen(true);
  presenterWindow.focus();
  return { ok: true };
});

ipcMain.handle("mindex:check-for-updates", async () => {
  if (!app.isPackaged || !updatesEnabled() || !autoUpdater) return { ok: false, reason: "updates-unavailable" };
  const result = await autoUpdater.checkForUpdates();
  return { ok: true, updateInfo: result?.updateInfo || pendingUpdateInfo };
});

ipcMain.handle("mindex:download-update", async () => {
  if (!app.isPackaged || !updatesEnabled() || !autoUpdater) return { ok: false, reason: "updates-unavailable" };
  await autoUpdater.downloadUpdate();
  return { ok: true };
});

ipcMain.handle("mindex:install-update", () => {
  if (!app.isPackaged || !updatesEnabled() || !autoUpdater) return { ok: false, reason: "updates-unavailable" };
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});

ipcMain.handle("mindex:import-keynote-deck", async (_event, payload = {}) => {
  const outputDir = payload.outputDir || path.join(app.getPath("userData"), "imported-decks");
  return importKeynoteDeck({
    ...payload,
    outputDir,
    repoRoot: payload.repoRoot || appRoot(),
  });
});

app.whenReady().then(() => {
  createMainWindow();
  let attempts = 0;
  mainWindowEnsureTimer = setInterval(() => {
    attempts += 1;
    ensureMainWindowVisible();
    if (attempts >= 10 || mainWindow?.isVisible()) {
      clearInterval(mainWindowEnsureTimer);
      mainWindowEnsureTimer = null;
    }
  }, 500);
  setTimeout(() => {
    if (!updatesEnabled()) return;
    configureAutoUpdater();
    if (app.isPackaged && autoUpdater) autoUpdater.checkForUpdates().catch(() => {});
  }, 2500);

  app.on("activate", () => {
    ensureMainWindowVisible();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
