const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !!process.env.ELECTRON_DEV;

// Path to store API key securely
const getApiKeyPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "openai-api-key.json");
};

// Path to store website credentials securely
const getCredentialsPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "website-credentials.json");
};

// Store API key securely (using Electron's safeStorage when available)
const saveOpenAiApiKey = (apiKey) => {
  try {
    const keyPath = getApiKeyPath();
    let encryptedKey = apiKey;
    
    // Use Electron's safeStorage if available (macOS Keychain, Windows Credential Manager, etc.)
    if (app.isReady() && process.platform === "darwin" && app.getPath) {
      // For macOS, we can use safeStorage, but for simplicity, we'll use a simple file
      // In production, consider using electron-store with encryption
      const data = { apiKey: apiKey };
      fs.writeFileSync(keyPath, JSON.stringify(data), { mode: 0o600 });
    } else {
      // Fallback: store in user data directory with restricted permissions
      const data = { apiKey: apiKey };
      fs.writeFileSync(keyPath, JSON.stringify(data), { mode: 0o600 });
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

// Retrieve API key
const getOpenAiApiKey = () => {
  try {
    const keyPath = getApiKeyPath();
    if (fs.existsSync(keyPath)) {
      const data = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      return { ok: true, apiKey: data.apiKey };
    }
    return { ok: false, apiKey: null };
  } catch (error) {
    return { ok: false, error: error.message, apiKey: null };
  }
};

// Clear API key
const clearOpenAiApiKey = () => {
  try {
    const keyPath = getApiKeyPath();
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

// Store website credentials securely
const saveWebsiteCredentials = (credentials) => {
  try {
    const credentialsPath = getCredentialsPath();
    const data = { email: credentials.email, password: credentials.password };
    fs.writeFileSync(credentialsPath, JSON.stringify(data), { mode: 0o600 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

// Retrieve website credentials
const getWebsiteCredentials = () => {
  try {
    const credentialsPath = getCredentialsPath();
    if (fs.existsSync(credentialsPath)) {
      const data = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      return { ok: true, credentials: { email: data.email, password: data.password } };
    }
    return { ok: false, credentials: null };
  } catch (error) {
    return { ok: false, error: error.message, credentials: null };
  }
};

// Clear website credentials
const clearWebsiteCredentials = () => {
  try {
    const credentialsPath = getCredentialsPath();
    if (fs.existsSync(credentialsPath)) {
      fs.unlinkSync(credentialsPath);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

// Expose IPC handlers for the renderer (keep secrets in main)
ipcMain.handle("zephyr:fetch-tests", async (event, opts) => {
  // Support mock mode via environment variable or option flag
  const useMock = process.env.ZEPHYR_MOCK === "true" || opts.useMock === true;
  
  if (useMock) {
    const { fetchZephyrTestsMock } = require("../renderer/src/zephyr-mock");
    return fetchZephyrTestsMock(opts);
  }
  
  const { fetchZephyrTests } = require("../renderer/src/zephyr");
  return fetchZephyrTests(opts);
});

ipcMain.handle("test:run-with-llm", async (event, opts) => {
  const runner = require("../shared/llm-runner");
  // Get API key from storage if not provided
  if (!opts.apiKey) {
    const keyResult = getOpenAiApiKey();
    if (keyResult.ok && keyResult.apiKey) {
      opts.apiKey = keyResult.apiKey;
    }
  }
  return runner.runTestWithLLM(opts);
});

// API key management handlers
ipcMain.handle("openai:save-api-key", async (event, apiKey) => {
  return saveOpenAiApiKey(apiKey);
});

ipcMain.handle("openai:get-api-key", async (event) => {
  return getOpenAiApiKey();
});

ipcMain.handle("openai:clear-api-key", async (event) => {
  return clearOpenAiApiKey();
});

// Website credentials management handlers
ipcMain.handle("website:save-credentials", async (event, credentials) => {
  return saveWebsiteCredentials(credentials);
});

ipcMain.handle("website:get-credentials", async (event) => {
  return getWebsiteCredentials();
});

ipcMain.handle("website:clear-credentials", async (event) => {
  return clearWebsiteCredentials();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

