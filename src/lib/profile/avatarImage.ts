/**
 * A profile photo is a few KB, not a camera original (sign-in lane 2026-10-06).
 *
 * The avatar used to be the phone photo read verbatim into a `data:` URL —
 * 3-8 MB from a modern camera. It was sent to the account on every save,
 * written into account metadata, and copied into the session cookie, where it
 * made the cookie too large for the browser to keep: the person was signed out
 * on every device and profile setup could never complete.
 *
 * The photo is now drawn onto a small square canvas and re-encoded as JPEG.
 */
export const AVATAR_EDGE_PX = 256;
export const AVATAR_JPEG_QUALITY = 0.85;

/** Centre-crop source rectangle for a square avatar. Pure, so it is testable. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.max(1, Math.min(width, height));
  return { sx: Math.max(0, (width - side) / 2), sy: Math.max(0, (height - side) / 2), side };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file could not be read as an image. Try a JPEG or PNG photo."));
    img.src = src;
  });
}

export async function avatarDataUrlFromFile(file: File, edge = AVATAR_EDGE_PX): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file for your photo.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { sx, sy, side } = squareCrop(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const out = Math.min(edge, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser could not prepare the photo.");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
