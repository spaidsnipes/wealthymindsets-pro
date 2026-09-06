// A fullscreen element is the visible modal root while the browser owns that
// top layer. Outside fullscreen, body escapes the shell's stacking contexts.
export function getShellModalPortalHost(): Element {
  return document.fullscreenElement ?? document.body;
}

export function getServerModalPortalHost(): null {
  return null;
}

export function subscribeShellModalPortalHost(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
