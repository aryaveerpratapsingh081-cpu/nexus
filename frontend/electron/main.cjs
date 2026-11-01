const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');

// Allow autonomous offline speech synthesis playback without requiring fresh user click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0b0d14',
    title: 'Nexus AI OS',
    show: false,
    frame: true, // Native titlebar or custom styling
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Strict Content Security Policy (allows local backend, Ollama, and audio blobs/data for Kashish voice)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' http://127.0.0.1:8005 http://localhost:8005 http://127.0.0.1:8000 http://localhost:8000 http://127.0.0.1:5173 http://localhost:5173; " +
          "media-src 'self' data: blob:; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' http://127.0.0.1:8005 http://localhost:8005 http://127.0.0.1:8000 http://localhost:8000 http://127.0.0.1:11434 http://127.0.0.1:5173 ws://127.0.0.1:5173 ws://localhost:5173; " +
          "font-src 'self' data: https:;"
        ],
      },
    });
  });

  // Explicitly grant microphone permissions for local voice input
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (['media', 'microphone', 'audio-capture'].includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (['media', 'microphone', 'audio-capture'].includes(permission)) {
      return true;
    }
    return false;
  });

  const isDev = process.env.NODE_ENV === 'development';
  const devUrl = 'http://127.0.0.1:5173';
  const distPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(distPath).catch(() => {
        setTimeout(() => mainWindow.loadURL(devUrl), 2000);
      });
    });
  } else {
    mainWindow.loadFile(distPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Allowlisted IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
