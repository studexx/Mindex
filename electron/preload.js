const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("mindexElectron", {
  isDesktop: true,
  openPresenterOutput: (payload) => ipcRenderer.invoke("mindex:open-presenter", payload),
  closePresenterOutput: () => ipcRenderer.invoke("mindex:close-presenter"),
  fullscreenPresenterOutput: () => ipcRenderer.invoke("mindex:fullscreen-presenter"),
  getPresenterDisplays: () => ipcRenderer.invoke("mindex:get-presenter-displays"),
  setPresenterAlwaysOnTop: (payload) => ipcRenderer.invoke("mindex:set-presenter-always-on-top", payload),
  checkForUpdates: () => ipcRenderer.invoke("mindex:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("mindex:download-update"),
  installUpdate: () => ipcRenderer.invoke("mindex:install-update"),
  importKeynoteDeck: (payload) => ipcRenderer.invoke("mindex:import-keynote-deck", payload),
  filePathForFile: (file) => webUtils.getPathForFile(file),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("mindex:update-available", (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("mindex:update-downloaded", (_event, info) => callback(info));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on("mindex:update-progress", (_event, progress) => callback(progress));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on("mindex:update-error", (_event, error) => callback(error));
  },
});
