const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Initialize logging
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'runtime-debug.log');

function logger(msg) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${msg}\n`;
  console.log(entry.trim());
  try {
    fs.appendFileSync(logFile, entry);
  } catch (err) {
    // Fallback if filesystem is locked
  }
}

logger('--- Application Starting ---');
logger(`Log file located at: ${logFile}`);

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff', // Ensure a solid background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false,
    title: 'AI 智能审核系统',
    icon: path.join(__dirname, '../public/icon.png') 
  });

  // Log all navigation failures
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logger(`CRITICAL: Page failed to load! Error: ${errorDescription} (${errorCode}) URL: ${validatedURL}`);
  });

  win.webContents.on('did-finish-load', () => {
    logger('INFO: Page has finished loading.');
  });

  // Log renderer console messages to file
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    logger(`RENDERER-${levels[level] || 'LOG'}: ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('crashed', (event) => logger('CRITICAL: Renderer process crashed!'));
  win.webContents.on('unresponsive', () => logger('CRITICAL: Renderer process became unresponsive!'));

  // Give the server a tiny bit of time to bind the port
  setTimeout(() => {
    win.loadURL(`http://localhost:${port}`).catch(err => logger(`Failed to load URL: ${err}`));
  }, 500);

  win.once('ready-to-show', () => {
    logger('Window ready to show.');
    win.show();
  });

  win.setMenuBarVisibility(false);
}

// Handle errors in main process
process.on('uncaughtException', (err) => {
  logger(`FATAL UNCAUGHT EXCEPTION: ${err.stack || err}`);
});

app.whenReady().then(() => {
  // Start the backend server
  process.env.NODE_ENV = 'production';
  // Use a random port if possible, but hardcode 3000 for simplicity or let server pick. We will set PORT for server
  const port = 30000 + Math.floor(Math.random() * 10000);
  process.env.PORT = port.toString();
  process.env.DB_CONFIG_PATH = path.join(app.getPath('userData'), 'db-config.json');
  
  try {
    require('./server.cjs');
    logger(`Backend server started on port ${port}`);
  } catch (err) {
    logger(`Failed to start backend server: ${err.message}`);
  }

  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
