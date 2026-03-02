/**
 * Selector engine: compute stable selector candidates for an element.
 * Priority: data-testid > data-qa > aria-label > role+name > label > placeholder > text > css > xpath.
 */

export interface SelectorCandidate {
  type: string;
  value: string;
}

export interface SelectorResult {
  primary: string;
  candidates: SelectorCandidate[];
}

const addCandidate = (
  candidates: SelectorCandidate[],
  type: string,
  value: string | null | undefined
): string | null => {
  if (value == null || String(value).trim() === "") return null;
  const v = String(value).trim();
  candidates.push({ type, value: v });
  return v;
};

/**
 * Get the first visible text from an element (trimmed, truncated).
 */
const getVisibleText = (el: Element, maxLen = 50): string => {
  const text = (el as HTMLElement).innerText?.trim() ?? "";
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
};

/**
 * Find associated label for an element (by id or parent label).
 */
const getLabelText = (el: Element): string | null => {
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return (label as HTMLElement).innerText?.trim() ?? null;
  }
  const parentLabel = el.closest("label");
  if (parentLabel) return (parentLabel as HTMLElement).innerText?.trim() ?? null;
  return null;
};

/**
 * Build a minimal CSS path that identifies the element (tag#id, tag.class, or tag:nth-of-type).
 */
const getCssPath = (el: Element): string => {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const id = current.getAttribute("id");
    if (id && /^[a-zA-Z][\w-]*$/.test(id) && !id.includes(" ")) {
      parts.unshift(`${tag}#${CSS.escape(id)}`);
      break;
    }
    const cls = current.getAttribute("class");
    if (cls) {
      const firstClass = cls.trim().split(/\s+/)[0];
      if (firstClass && /^[a-zA-Z][\w-]*$/.test(firstClass)) {
        parts.unshift(`${tag}.${CSS.escape(firstClass)}`);
        current = current.parentElement;
        continue;
      }
    }
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c: Element) => c.tagName === current!.tagName
      );
      const index = siblings.indexOf(current as Element) + 1;
      parts.unshift(`${tag}:nth-of-type(${index})`);
    } else {
      parts.unshift(tag);
    }
    current = parent;
  }
  return parts.join(" > ");
};

/**
 * Build a basic XPath from body to element.
 */
const getXPath = (el: Element): string => {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const siblings = Array.from(parent.children).filter(
      (c: Element) => c.tagName === current!.tagName
    );
    const index = siblings.indexOf(current as Element) + 1;
    parts.unshift(`${tag}[${index}]`);
    current = parent;
  }
  return "//" + parts.join("/");
};

/**
 * Get role and accessible name for aria-based selector.
 */
const getRoleAndName = (el: Element): string | null => {
  const role = el.getAttribute("role") ?? (el as HTMLElement).getAttribute("aria-label");
  const name =
    el.getAttribute("aria-label") ??
    (el as HTMLInputElement).name ??
    getVisibleText(el, 30);
  if (role && name) return `role=${role}, name=${name}`;
  if (role) return `role=${role}`;
  if (name) return name;
  return null;
};

/**
 * Compute selector candidates for an element; first valid candidate becomes primary.
 */
export const getSelector = (element: Element): SelectorResult => {
  const candidates: SelectorCandidate[] = [];
  let primary = "";

  const testId = element.getAttribute("data-testid");
  if (addCandidate(candidates, "data-testid", testId) && !primary) {
    primary = `[data-testid="${testId}"]`;
  }

  const dataQa = element.getAttribute("data-qa");
  if (addCandidate(candidates, "data-qa", dataQa) && !primary) {
    primary = `[data-qa="${dataQa}"]`;
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (addCandidate(candidates, "aria-label", ariaLabel) && !primary) {
    primary = `[aria-label="${ariaLabel}"]`;
  }

  const roleName = getRoleAndName(element);
  if (addCandidate(candidates, "role+name", roleName) && !primary && roleName) {
    primary = roleName.startsWith("role=") ? roleName : `text=${roleName}`;
  }

  const labelText = getLabelText(element);
  if (addCandidate(candidates, "label", labelText) && !primary && labelText) {
    primary = `label=${labelText}`;
  }

  const placeholder = (element as HTMLInputElement).getAttribute?.("placeholder");
  if (addCandidate(candidates, "placeholder", placeholder) && !primary && placeholder) {
    primary = `[placeholder="${placeholder}"]`;
  }

  const visibleText = getVisibleText(element);
  if (addCandidate(candidates, "visible-text", visibleText) && !primary && visibleText) {
    primary = `text=${visibleText}`;
  }

  const cssPath = getCssPath(element);
  addCandidate(candidates, "css", cssPath);
  if (!primary) primary = cssPath;

  const xpath = getXPath(element);
  addCandidate(candidates, "xpath", xpath);
  if (!primary) primary = xpath;

  return { primary, candidates };
};
