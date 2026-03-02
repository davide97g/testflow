/**
 * Event normalizer: convert raw DOM events + selector result into a RecordedStep.
 */

import type { RecordedStep } from "./step-model.js";
import { generateId } from "./step-model.js";
import type { SelectorResult } from "./selector-engine.js";

const getSemanticLabelFromElement = (el: Element): string => {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  const name = (el as HTMLInputElement).name;
  if (name?.trim()) return name.trim();
  const placeholder = (el as HTMLInputElement).getAttribute?.("placeholder");
  if (placeholder?.trim()) return placeholder.trim();
  const id = el.getAttribute("id");
  if (id?.trim()) return id.trim();
  const text = (el as HTMLElement).innerText?.trim();
  if (text) return text.length > 40 ? text.slice(0, 40) + "…" : text;
  const tag = el.tagName.toLowerCase();
  return tag;
};

export const normalizeClick = (
  element: Element,
  selectorResult: SelectorResult,
  url: string
): RecordedStep => {
  const label = getSemanticLabelFromElement(element);
  const semanticLabel = label ? `Click ${label}` : "Click";
  return {
    id: generateId(),
    action: "click",
    semanticLabel,
    url,
    selector: selectorResult,
    timestamp: Date.now(),
  };
};

export const normalizeType = (
  element: Element,
  value: string,
  selectorResult: SelectorResult,
  url: string
): RecordedStep => {
  const label = getSemanticLabelFromElement(element);
  const semanticLabel = label ? `Enter ${label}` : "Enter text";
  return {
    id: generateId(),
    action: "type",
    semanticLabel,
    inputValue: value,
    url,
    selector: selectorResult,
    timestamp: Date.now(),
  };
};

export const normalizeSubmit = (
  element: Element,
  selectorResult: SelectorResult,
  url: string
): RecordedStep => {
  const label = getSemanticLabelFromElement(element);
  const semanticLabel = label ? `Submit ${label}` : "Submit form";
  return {
    id: generateId(),
    action: "submit",
    semanticLabel,
    url,
    selector: selectorResult,
    timestamp: Date.now(),
  };
};

export const normalizeNavigate = (url: string, previousUrl: string): RecordedStep => {
  const path = new URL(url).pathname || "/";
  const semanticLabel = `Navigate to ${path}`;
  return {
    id: generateId(),
    action: "navigate",
    semanticLabel,
    url,
    selector: { primary: url, candidates: [{ type: "url", value: url }] },
    timestamp: Date.now(),
  };
};
