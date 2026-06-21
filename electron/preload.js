/**
 * WealthyMindsets Pro — Electron Preload Script
 * Exposes a safe, limited API from Node/Electron to the renderer.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wmElectron", {
  // App info
  getVersion:  () => ipcRenderer.invoke("app-version"),
  getPlatform: () => ipcRenderer.invoke("platform"),

  // Flags
  isElectron:  true,
});
