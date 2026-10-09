/**
 * WHERE A PASTED RADIO LINK MAY POINT (API audit P2-8, 2026-10-09).
 *
 * A track's link is fetched by every listener's browser. Any member with a
 * handle could add ANY https URL, so one member could point the whole room at a
 * site of their choosing (tracking each listener's address, or worse). Links are
 * now accepted from a short NAMED list: WM's own store, archive.org and Dropbox
 * direct links. Anything else is uploaded instead. Measured on serving 79bb6fd:
 * every track is an upload, so the list turns nobody away today.
 *
 * Extend deliberately — a host per line, never a wildcard for all sites. PURE.
 */
export const RADIO_LINK_HOSTS: readonly string[] = ["archive.org", "dl.dropboxusercontent.com"];

export const RADIO_LINK_REFUSAL =
  "Links are accepted from WM's own store, archive.org and Dropbox direct links only. Upload the audio file instead." as const;

/** True when the link is https, carries no credentials or port, and its host is the store's or on the list. */
export function radioLinkAllowed(link: string, storeUrl: string): boolean {
  let host = "";
  try {
    const u = new URL(link);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  let store = "";
  try { store = new URL(storeUrl).hostname.toLowerCase(); } catch { store = ""; }
  return (store !== "" && host === store) || RADIO_LINK_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}
