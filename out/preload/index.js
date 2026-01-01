"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // Project Operations
  openProject: () => electron.ipcRenderer.invoke("app:open-project"),
  // Server Operations
  startServer: (config) => electron.ipcRenderer.invoke("server:start", config),
  stopServer: () => electron.ipcRenderer.invoke("server:stop"),
  // Event Listeners
  onGraphUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("graph:update", listener);
    return () => electron.ipcRenderer.removeListener("graph:update", listener);
  },
  onFileChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("file:changed", listener);
    return () => electron.ipcRenderer.removeListener("file:changed", listener);
  },
  onServerReady: (callback) => {
    const listener = (_event, data) => callback(data);
    electron.ipcRenderer.on("server:ready", listener);
    return () => electron.ipcRenderer.removeListener("server:ready", listener);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("livespec", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.livespec = api;
}
