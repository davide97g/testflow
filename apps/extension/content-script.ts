/**
 * Content script: runs in the page context; listens for recording commands and DOM events.
 * When recording is on, captures click, input, change, submit, navigation and sends steps to background.
 */

import { getSelector } from "./selector-engine.js";
import {
  normalizeClick,
  normalizeType,
  normalizeSubmit,
  normalizeNavigate,
} from "./event-normalizer.js";
import type { RecordedStep } from "./step-model.js";

let isRecording = false;
let lastUrl = window.location.href;

const sendStep = (step: RecordedStep): void => {
  chrome.runtime.sendMessage({ type: "addStep", step }).catch(() => {
    // Background may be unavailable (e.g. extension reloaded)
  });
};

const handleClick = (e: Event): void => {
  if (!isRecording) return;
  const target = e.target as Element;
  if (!target?.closest?.("body")) return;
  const selectorResult = getSelector(target);
  const step = normalizeClick(target, selectorResult, window.location.href);
  sendStep(step);
};

const handleInputOrChange = (e: Event): void => {
  if (!isRecording) return;
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!target?.closest?.("body")) return;
  const selectorResult = getSelector(target);
  const step = normalizeType(target, target.value ?? "", selectorResult, window.location.href);
  sendStep(step);
};

const handleSubmit = (e: Event): void => {
  if (!isRecording) return;
  const target = e.target as HTMLFormElement;
  if (!target?.closest?.("body")) return;
  const selectorResult = getSelector(target);
  const step = normalizeSubmit(target, selectorResult, window.location.href);
  sendStep(step);
};

const checkNavigation = (): void => {
  if (!isRecording) return;
  const current = window.location.href;
  if (current !== lastUrl) {
    const step = normalizeNavigate(current, lastUrl);
    sendStep(step);
    lastUrl = current;
  }
};

const startListeners = (): void => {
  document.addEventListener("click", handleClick, true);
  document.addEventListener("input", handleInputOrChange, true);
  document.addEventListener("change", handleInputOrChange, true);
  document.addEventListener("submit", handleSubmit, true);
  window.addEventListener("popstate", checkNavigation);
  window.addEventListener("hashchange", checkNavigation);
};

const stopListeners = (): void => {
  document.removeEventListener("click", handleClick, true);
  document.removeEventListener("input", handleInputOrChange, true);
  document.removeEventListener("change", handleInputOrChange, true);
  document.removeEventListener("submit", handleSubmit, true);
  window.removeEventListener("popstate", checkNavigation);
  window.removeEventListener("hashchange", checkNavigation);
};

chrome.runtime.onMessage.addListener(
  (
    message: { type: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === "startRecording") {
      isRecording = true;
      lastUrl = window.location.href;
      startListeners();
      sendResponse({ ok: true });
    } else if (message.type === "stopRecording") {
      isRecording = false;
      stopListeners();
      sendResponse({ ok: true });
    }
    return true;
  }
);
