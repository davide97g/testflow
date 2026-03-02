/**
 * Panel script: UI for Start/Stop Recording and Export JSON.
 * Communicates with background for state and steps.
 */

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;

const setState = (recording: boolean): void => {
  statusEl.textContent = recording ? "Recording" : "Stopped";
  startBtn.disabled = recording;
  stopBtn.disabled = !recording;
};

const sendMessage = <T>(message: { type: string }): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
};

const handleStart = (): void => {
  sendMessage({ type: "startRecording" })
    .then(() => setState(true))
    .catch(() => setState(false));
};

const handleStop = (): void => {
  sendMessage({ type: "stopRecording" })
    .then(() => setState(false))
    .catch(() => setState(false));
};

const handleExport = (): void => {
  sendMessage<{ steps: unknown[]; recordedUrl: string }>({ type: "getSteps" })
    .then(({ steps, recordedUrl }) => {
      const payload = {
        metadata: {
          url: recordedUrl || "",
          recordedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
        steps,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.json";
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(console.error);
};

startBtn.addEventListener("click", handleStart);
stopBtn.addEventListener("click", handleStop);
exportBtn.addEventListener("click", handleExport);

sendMessage<{ isRecording: boolean }>({ type: "getState" })
  .then(({ isRecording }) => setState(isRecording))
  .catch(() => setState(false));
