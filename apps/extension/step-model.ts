/**
 * Step model: types and helpers for recorded QA steps.
 * Shared by content script (creating steps) and panel/background (export).
 */

export type RecordedAction = "click" | "type" | "submit" | "navigate";

export interface SelectorCandidate {
  type: string;
  value: string;
}

export interface StepSelector {
  primary: string;
  candidates: SelectorCandidate[];
}

export interface RecordedStep {
  id: string;
  action: RecordedAction;
  semanticLabel: string;
  inputValue?: string;
  url: string;
  selector: StepSelector;
  timestamp: number;
}

export interface ExportMetadata {
  url: string;
  recordedAt: string;
  userAgent: string;
}

export interface ExportFormat {
  metadata: ExportMetadata;
  steps: RecordedStep[];
}

/**
 * Generate a UUID-like id for a recorded step.
 */
export const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const hex = (n: number) => Math.floor(n).toString(16);
  return `${Date.now().toString(36)}-${hex(Math.random() * 0xffffffff)}-${hex(Math.random() * 0xffffffff)}`;
};
