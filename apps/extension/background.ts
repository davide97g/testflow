/**
 * Background service worker: holds recording state and steps in memory.
 * Handles start/stop, addStep, getSteps, getState; notifies content script in active tab.
 */

interface StoredStep {
  id: string;
  action: string;
  semanticLabel: string;
  inputValue?: string;
  url: string;
  selector: { primary: string; candidates: { type: string; value: string }[] };
  timestamp: number;
}

let isRecording = false;
let steps: StoredStep[] = [];
let recordedTabId: number | null = null;

const notifyContentScript = (tabId: number, type: "startRecording" | "stopRecording"): void => {
  chrome.tabs.sendMessage(tabId, { type }).catch(() => {
    // Tab may not have content script loaded yet; scripting.executeScript can inject
  });
};

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; step?: StoredStep },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === "startRecording") {
      isRecording = true;
      steps = [];
      const tabId = sender.tab?.id ?? null;
      recordedTabId = tabId;
      if (tabId) {
        notifyContentScript(tabId, "startRecording");
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            recordedTabId = tabs[0].id;
            notifyContentScript(tabs[0].id, "startRecording");
          }
        });
      }
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "stopRecording") {
      isRecording = false;
      if (recordedTabId != null) {
        notifyContentScript(recordedTabId, "stopRecording");
      }
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "addStep" && message.step && isRecording) {
      steps.push(message.step);
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "getState") {
      sendResponse({ isRecording });
      return true;
    }

    if (message.type === "getSteps") {
      const getRecordedUrl = (): Promise<string> => {
        if (recordedTabId != null) {
          return chrome.tabs.get(recordedTabId).then((tab) => tab.url ?? "").catch(() => "");
        }
        return Promise.resolve("");
      };
      getRecordedUrl().then((url) => {
        sendResponse({ steps, recordedUrl: url });
      });
      return true; // async response
    }

    return false;
  }
);
