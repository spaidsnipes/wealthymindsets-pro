/**
 * WealthyMindsets Pro — Icon Generator
 *
 * Generates all required PWA icon sizes from a source SVG/PNG.
 * Requires: npm install sharp
 *
 * Usage: node scripts/generate-icons.js [source-image]
 * Default source: public/images/wm-logo.svg
 */

const path  = require("path");
const fs    = require("fs");

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const OUT   = path.join(__dirname, "../public/icons");

async function main() {
  // Try to load sharp
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error(
      "❌  sharp not found. Install it first:\n\n  npm install sharp\n\nThen re-run: node scripts/generate-icons.js"
    );
    process.exit(1);
  }

  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const src = process.argv[2] || path.join(__dirname, "../public/images/wm-logo.svg");
  if (!fs.existsSync(src)) {
    console.error(`❌  Source not found: ${src}`);
    console.error("    Place your app icon at public/images/wm-logo.svg and re-run.");
    process.exit(1);
  }

  console.log(`\n🎨  Generating WealthyMindsets Pro PWA icons from: ${path.basename(src)}\n`);

  for (const size of SIZES) {
    const out = path.join(OUT, `icon-${size}x${size}.png`);
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 7, g: 10, b: 15, alpha: 1 } })
      .png()
      .toFile(out);
    console.log(`  ✅  ${size}x${size}  →  public/icons/icon-${size}x${size}.png`);
  }

  // favicon.ico (32x32)
  const favicon = path.join(__dirname, "../public/favicon.ico");
  await sharp(src).resize(32, 32).png().toFile(favicon.replace(".ico", ".png"));
  console.log(`  ✅  32x32   →  public/favicon.png`);

  console.log(`\n✨  All icons generated! Update public/manifest.json if needed.\n`);
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
