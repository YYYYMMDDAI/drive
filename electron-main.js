const { app, BrowserWindow, globalShortcut, session } = require("electron");
const path = require("path");

let mainWindow = null;

// Chromium flags: allow media without user gesture, skip permission prompts
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("use-fake-ui-for-media-stream");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 860,
    minWidth: 400,
    minHeight: 600,
    title: "Voice Input",
    icon: path.join(__dirname, "icons", "icon.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: "#0f0f14",
  });

  // Always grant all permissions (mic, clipboard, media, etc.)
  const ses = mainWindow.webContents.session;

  ses.setPermissionCheckHandler(() => true);

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Security: set CSP for Electron renderer
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; " +
          "script-src 'self' https://cdn.jsdelivr.net blob:; " +
          "connect-src 'self' https://api.mymemory.translated.net https://cdn.jsdelivr.net https://huggingface.co; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data:; " +
          "media-src 'self' blob:; " +
          "worker-src 'self' blob:;"
        ],
      },
    });
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  createWindow();

  // Global shortcut: Alt+R — works even when app is minimized/unfocused
  globalShortcut.register("Alt+R", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "r",
      modifiers: ["alt"],
    });
  });

  // Global shortcut: Alt+C — copy result
  globalShortcut.register("Alt+C", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "c",
      modifiers: ["alt"],
    });
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
