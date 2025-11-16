const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchZephyrTests: (opts) => ipcRenderer.invoke('zephyr:fetch-tests', opts),
  runTestWithLLM: (opts) => ipcRenderer.invoke('test:run-with-llm', opts),
  // OpenAI API key management
  saveOpenAiApiKey: (apiKey) => ipcRenderer.invoke('openai:save-api-key', apiKey),
  getOpenAiApiKey: () => ipcRenderer.invoke('openai:get-api-key'),
  clearOpenAiApiKey: () => ipcRenderer.invoke('openai:clear-api-key'),
  // Website credentials management
  saveWebsiteCredentials: (credentials) => ipcRenderer.invoke('website:save-credentials', credentials),
  getWebsiteCredentials: () => ipcRenderer.invoke('website:get-credentials'),
  clearWebsiteCredentials: () => ipcRenderer.invoke('website:clear-credentials'),
  // Direct access to mock function for standalone examples
  fetchZephyrTestsMock: async (opts) => {
    // In renderer context, we can't directly require, so we'll use IPC
    // For standalone examples, import directly in the component
    return ipcRenderer.invoke('zephyr:fetch-tests', { ...opts, useMock: true });
  },
});

