"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const chokidar = require("chokidar");
const fs = require("fs");
const ws = require("ws");
const express = require("express");
const icon = path.join(__dirname, "../../resources/icon.png");
var WSMessageType = /* @__PURE__ */ ((WSMessageType2) => {
  WSMessageType2["GRAPH_SYNC"] = "graph:sync";
  WSMessageType2["FILE_CHANGED"] = "file:changed";
  WSMessageType2["NODE_CREATED"] = "node:created";
  WSMessageType2["NODE_UPDATED"] = "node:updated";
  WSMessageType2["NODE_DELETED"] = "node:deleted";
  WSMessageType2["WELCOME"] = "welcome";
  WSMessageType2["HELLO"] = "hello";
  WSMessageType2["CURSOR_MOVED"] = "cursor:moved";
  WSMessageType2["ERROR"] = "error";
  return WSMessageType2;
})(WSMessageType || {});
let wsServer = null;
const clients = /* @__PURE__ */ new Map();
let currentGraphId = null;
function startWebSocketServer(options) {
  if (wsServer) {
    stopWebSocketServer();
  }
  currentGraphId = options.graphId || null;
  wsServer = new ws.WebSocketServer({ port: options.port });
  wsServer.on("listening", () => {
    console.log(`WebSocket server listening on port ${options.port}`);
  });
  wsServer.on("connection", (ws2, req) => {
    const clientId = generateClientId();
    console.log(`New WebSocket connection: ${clientId} from ${req.socket.remoteAddress}`);
    clients.set(ws2, clientId);
    sendWelcome(ws2);
    ws2.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws2, message);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
        sendError(ws2, "INVALID_MESSAGE", "Failed to parse message");
      }
    });
    ws2.on("close", () => {
      console.log(`WebSocket disconnected: ${clientId}`);
      clients.delete(ws2);
    });
    ws2.on("error", (err) => {
      console.error(`WebSocket error for ${clientId}:`, err);
    });
  });
  wsServer.on("error", (err) => {
    console.error("WebSocket server error:", err);
  });
}
function stopWebSocketServer() {
  if (wsServer) {
    wsServer.close();
    wsServer = null;
    clients.clear();
    console.log("WebSocket server stopped");
  }
}
function broadcast(message) {
  if (!wsServer) return;
  const data = JSON.stringify(message);
  wsServer.clients.forEach((ws$1) => {
    if (ws$1.readyState === ws.WebSocket.OPEN) {
      ws$1.send(data);
    }
  });
}
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function sendWelcome(ws2, _clientId) {
  const message = {
    type: WSMessageType.WELCOME,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    payload: {
      serverId: "livespec_server",
      version: "1.0.0",
      graphId: currentGraphId || void 0
    }
  };
  ws2.send(JSON.stringify(message));
}
function sendError(ws2, code, message, details) {
  const errorMessage = {
    type: WSMessageType.ERROR,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    payload: { code, message, details }
  };
  ws2.send(JSON.stringify(errorMessage));
}
function handleMessage(_ws, message) {
  switch (message.type) {
    case WSMessageType.HELLO:
      console.log("Client hello:", message.payload);
      break;
    case WSMessageType.CURSOR_MOVED:
      broadcast({
        type: WSMessageType.CURSOR_MOVED,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        payload: message.payload
      });
      break;
    default:
      console.warn("Unknown WebSocket message type:", message.type);
  }
}
function setGraphId(graphId) {
  currentGraphId = graphId;
}
let watcher = null;
let mainWindow$1 = null;
function setMainWindow(window) {
  mainWindow$1 = window;
}
function startFileWatcher(rootPath) {
  if (watcher) {
    stopFileWatcher();
  }
  console.log("[FileWatcher] Starting watcher for:", rootPath);
  const { join } = require("path");
  const { existsSync } = require("fs");
  const livespecDir = join(rootPath, ".LiveSpec");
  const hasLiveSpecDir = existsSync(livespecDir);
  if (hasLiveSpecDir) {
    console.log("[FileWatcher] Found .LiveSpec subdirectory, will watch it too");
  }
  const pathsToWatch = hasLiveSpecDir ? [rootPath, livespecDir] : [rootPath];
  watcher = chokidar.watch(pathsToWatch, {
    // Ignore common files/directories (but not .LiveSpec)
    ignored: [
      /(^|[\/\\])\.\w+/,
      // dotfiles (but will still watch .LiveSpec since it's explicitly added)
      /node_modules/,
      /\.git/,
      /\.vscode/,
      /dist/,
      /build/,
      /out/
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  watcher.on("change", (filePath) => {
    handleFileChange("change", filePath);
  });
  watcher.on("add", (filePath) => {
    console.log(`[FileWatcher] File added: ${filePath}`);
    handleFileChange("add", filePath);
  });
  watcher.on("unlink", (filePath) => {
    console.log(`[FileWatcher] File removed: ${filePath}`);
    handleFileChange("unlink", filePath);
  });
  watcher.on("ready", () => {
    console.log("[FileWatcher] Ready and watching for changes");
  });
  watcher.on("error", (error) => {
    console.error("[FileWatcher] Error:", error);
  });
}
function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log("[FileWatcher] Stopped");
  }
}
function handleFileChange(type, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  console.log(`[FileWatcher] ${type.toUpperCase()}: ${filePath}`);
  if (ext === ".html") {
    handleHTMLFileChange(filePath);
    return;
  }
  if (filename === "spec_graph.json") {
    handleGraphFileChange(filePath);
    return;
  }
}
function handleHTMLFileChange(filePath) {
  console.log("[FileWatcher] HTML file changed, broadcasting reload signal");
  try {
    const message = {
      type: WSMessageType.FILE_CHANGED,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      payload: {
        filePath,
        content: ""
        // Content not needed for reload
      }
    };
    broadcast(message);
    console.log("[FileWatcher] Broadcasted FILE_CHANGED to WebSocket clients");
  } catch (error) {
    console.error("[FileWatcher] Failed to broadcast file change:", error);
  }
}
function handleGraphFileChange(filePath) {
  console.log("[FileWatcher] spec_graph.json changed, updating graph");
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const graph = JSON.parse(content);
    if (!graph.meta || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error("Invalid graph structure");
    }
    console.log("[FileWatcher] Graph loaded:", graph.meta.name, graph.nodes.length, "nodes");
    if (mainWindow$1 && !mainWindow$1.isDestroyed()) {
      mainWindow$1.webContents.send("graph:update", { graph });
      console.log("[FileWatcher] Sent GRAPH_UPDATE to Renderer");
    } else {
      console.warn("[FileWatcher] Main window not available");
    }
    const message = {
      type: WSMessageType.GRAPH_SYNC,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      payload: {
        graph,
        fullSync: true
      }
    };
    broadcast(message);
  } catch (error) {
    console.error("[FileWatcher] Failed to load graph:", error);
  }
}
let app = null;
let server = null;
let currentRootPath = null;
const BRIDGE_SCRIPT_URL = "/__livespec/client.js";
const BRIDGE_SCRIPT_TAG = `<script src="${BRIDGE_SCRIPT_URL}"><\/script>`;
function createHTMLInjectionMiddleware() {
  return (_req, res, next) => {
    const originalSend = res.send;
    res.send = function(body) {
      if (typeof body !== "string") {
        return originalSend.call(this, body);
      }
      const contentType = this.getHeader("Content-Type");
      if (contentType && !contentType.includes("text/html")) {
        return originalSend.call(this, body);
      }
      if (body.includes(BRIDGE_SCRIPT_URL)) {
        console.log("[LiveSpec] Script already injected, skipping");
        return originalSend.call(this, body);
      }
      const bodyCloseTag = "</body>";
      const bodyLower = body.toLowerCase();
      const bodyCloseIndex = bodyLower.lastIndexOf(bodyCloseTag);
      let modifiedBody;
      if (bodyCloseIndex !== -1) {
        const injectionPoint = bodyCloseIndex;
        modifiedBody = body.slice(0, injectionPoint) + BRIDGE_SCRIPT_TAG + body.slice(injectionPoint);
        console.log("[LiveSpec] Injected bridge script before </body>");
      } else {
        modifiedBody = body + BRIDGE_SCRIPT_TAG;
        console.log("[LiveSpec] No </body> found, appended script to end");
      }
      this.setHeader("Content-Length", Buffer.byteLength(modifiedBody));
      return originalSend.call(this, modifiedBody);
    };
    next();
  };
}
function createApp() {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rootPath: currentRootPath
    });
  });
  return expressApp;
}
function startExpressServer(port, rootPath) {
  return new Promise((resolve, reject) => {
    if (!app) {
      app = createApp();
    }
    currentRootPath = rootPath;
    const { join } = require("path");
    const { existsSync } = require("fs");
    const livespecDir = join(rootPath, ".LiveSpec");
    const staticRootPath = existsSync(livespecDir) ? livespecDir : rootPath;
    console.log(`[Express] Serving static files from: ${staticRootPath}`);
    app.use(express.static(staticRootPath));
    app.get(BRIDGE_SCRIPT_URL, (_req, res) => {
      res.set("Content-Type", "application/javascript; charset=utf-8");
      try {
        const possiblePaths = [
          // Development: src/main/static/client.js
          join(__dirname, "..", "..", "main", "static", "client.js"),
          // Production: out/main/static/client.js
          join(__dirname, "static", "client.js"),
          // Alternative: same directory
          join(__dirname, "client.js")
        ];
        let clientScript = null;
        let foundPath = "";
        for (const checkPath of possiblePaths) {
          if (existsSync(checkPath)) {
            clientScript = fs.readFileSync(checkPath, "utf-8");
            foundPath = checkPath;
            break;
          }
        }
        if (clientScript) {
          res.send(clientScript);
          console.log("[LiveSpec] Serving bridge script from:", foundPath);
        } else {
          console.error("[LiveSpec] Bridge script not found in any location");
          console.error("[LiveSpec] Tried paths:", possiblePaths);
          res.status(404).send("// Bridge script not found");
        }
      } catch (error) {
        console.error("[LiveSpec] Failed to read bridge script:", error);
        res.status(500).send("// Failed to load bridge script");
      }
    });
    app.use(createHTMLInjectionMiddleware());
    server = app.listen(port, () => {
      console.log(`Express server listening on port ${port}`);
      console.log(`Serving project folder: ${rootPath}`);
      console.log(`Bridge script available at: ${BRIDGE_SCRIPT_URL}`);
      resolve();
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}
function stopExpressServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        app = null;
        server = null;
        currentRootPath = null;
        console.log("Express server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}
let mainWindow = null;
let currentProject = {
  rootPath: null,
  graph: null,
  serverRunning: false,
  wsPort: 3899,
  httpPort: 3900
};
const DEFAULT_WS_PORT = 3899;
const DEFAULT_HTTP_PORT = 3900;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
    setMainWindow(null);
  });
  setMainWindow(mainWindow);
}
function setupIPCHandlers() {
  electron.ipcMain.handle("app:open-project", async () => {
    try {
      const result = await electron.dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
        title: "Select LiveSpec Project Folder"
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { rootPath: null, canceled: true };
      }
      let rootPath = result.filePaths[0];
      const { sep } = await import("path");
      if (rootPath.endsWith(`${sep}.LiveSpec`) || rootPath.endsWith(`${sep}LiveSpec`)) {
        rootPath = rootPath.substring(0, rootPath.lastIndexOf(sep));
        console.log("[Main] Detected LiveSpec subdirectory, using parent:", rootPath);
      }
      console.log("Opening project:", rootPath);
      if (currentProject.serverRunning) {
        stopWebSocketServer();
        stopExpressServer();
        stopFileWatcher();
      }
      currentProject.rootPath = rootPath;
      currentProject.serverRunning = false;
      startFileWatcher(rootPath);
      const fs2 = await import("fs/promises");
      const { existsSync } = await import("fs");
      const livespecDir = path.join(rootPath, ".LiveSpec");
      const graphPathInRoot = path.join(rootPath, "spec_graph.json");
      const graphPathInLiveSpec = path.join(livespecDir, "spec_graph.json");
      let graphPath = graphPathInRoot;
      if (!existsSync(graphPathInRoot) && existsSync(graphPathInLiveSpec)) {
        graphPath = graphPathInLiveSpec;
        console.log("[Main] Found spec_graph.json in .LiveSpec subdirectory");
      }
      try {
        const graphContent = await fs2.readFile(graphPath, "utf-8");
        const graph = JSON.parse(graphContent);
        currentProject.graph = graph;
        setGraphId(graph.meta.name);
        console.log("[Main] Graph loaded successfully:", graph.nodes.length, "nodes,", graph.edges.length, "edges");
        console.log("[Main] Sending graph:update to renderer");
        mainWindow?.webContents.send("graph:update", { graph });
        console.log("[Main] graph:update event sent");
      } catch (err) {
        console.log("No spec_graph.json found in project folder");
        currentProject.graph = {
          meta: { name: "Untitled", version: "1.0.0" },
          nodes: [],
          edges: []
        };
      }
      return { rootPath, canceled: false };
    } catch (error) {
      console.error("Failed to open project:", error);
      return { rootPath: null, canceled: true };
    }
  });
  electron.ipcMain.handle("server:start", async (_event, payload) => {
    const wsPort = payload?.wsPort || DEFAULT_WS_PORT;
    const httpPort = payload?.httpPort || DEFAULT_HTTP_PORT;
    try {
      if (!currentProject.rootPath) {
        throw new Error("No project open");
      }
      await startExpressServer(httpPort, currentProject.rootPath);
      startWebSocketServer({ port: wsPort });
      currentProject.serverRunning = true;
      currentProject.wsPort = wsPort;
      currentProject.httpPort = httpPort;
      mainWindow?.webContents.send("server:ready", { wsPort, httpPort });
      return { success: true, wsPort, httpPort };
    } catch (error) {
      console.error("Failed to start servers:", error);
      return { success: false, wsPort: 0, httpPort: 0 };
    }
  });
  electron.ipcMain.handle("server:stop", async () => {
    try {
      stopWebSocketServer();
      stopExpressServer();
      currentProject.serverRunning = false;
      mainWindow?.webContents.send("server:status-changed", { running: false });
      return { success: true };
    } catch (error) {
      console.error("Failed to stop servers:", error);
      return { success: false };
    }
  });
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.livespec.app");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  setupIPCHandlers();
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  stopFileWatcher();
  stopWebSocketServer();
  stopExpressServer();
});
