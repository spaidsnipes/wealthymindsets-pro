/**
 * THE WOW WORLD DOOR, FROM A WM BUTTON (API audit P2-4, 2026-10-09).
 *
 * /api/passport/to-wow mints a sign-in link only for a POST from this site, so
 * a button can no longer `window.open` its URL. This posts a small form into a
 * NEW TAB (WM stays where it was): the browser names this site as the Origin,
 * the session cookie rides because the form is same-site, and the route answers
 * with the redirect to WOW. Nothing is stored; the form is removed at once.
 */
export const WOW_DOOR_ACTION = "/api/passport/to-wow" as const;

/** Where on WOW to land, as the form's one field (the route sanitises it). */
export function wowDoorFields(to?: string): Readonly<Record<string, string>> {
  return to && to.startsWith("/") ? { to } : {};
}

export function openWowWorld(to?: string, doc: Document | undefined = typeof document === "undefined" ? undefined : document): boolean {
  if (!doc?.body) return false;
  const form = doc.createElement("form");
  form.method = "POST";
  form.action = WOW_DOOR_ACTION;
  form.target = "_blank";
  form.rel = "noopener";
  form.style.display = "none";
  for (const [name, value] of Object.entries(wowDoorFields(to))) {
    const input = doc.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  try { form.submit(); } finally { form.remove(); }
  return true;
}
