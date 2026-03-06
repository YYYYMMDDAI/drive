const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: "Voice Input",
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless-style title bar (Windows)
    titleBarStyle: "default",
    autoHideMenuBar: true,
    backgroundColor: "#0f0f14",
  });

  mainWindow.loadFile("index.html");

  // Grant microphone permission automatically
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true); // Always allow mic
      } else {
        callback(true);
      }
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Register global shortcut so Alt+R works even when app is not focused
app.on("ready", () => {
  createWindow();

  // Global shortcut: Alt+R to toggle recording (sends message to renderer)
  globalShortcut.register("Alt+R", () => {
    if (mainWindow) {
      // Bring window to front and send shortcut
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.sendInputEvent({
        type: "keyDown",
        keyCode: "r",
        modifiers: ["alt"],
      });
    }
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
