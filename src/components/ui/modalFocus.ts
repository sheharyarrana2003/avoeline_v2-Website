/** Pure helpers for modal focus trap (unit-testable). */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null,
  );
}

/** Cycle Tab / Shift+Tab within root. Returns true if the event was handled. */
export function trapFocusKeyDown(
  root: ParentNode,
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  active: Element | null,
): boolean {
  if (event.key !== "Tab") return false;
  const nodes = getFocusableElements(root);
  if (!nodes.length) {
    event.preventDefault();
    return true;
  }
  const first = nodes[0]!;
  const last = nodes[nodes.length - 1]!;
  if (event.shiftKey) {
    if (active === first || !root.contains(active)) {
      event.preventDefault();
      last.focus();
      return true;
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
