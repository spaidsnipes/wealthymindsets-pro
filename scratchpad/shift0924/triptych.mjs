import sharp from "sharp";
const dir = "scratchpad/shift0924/";
const crops = await Promise.all(["FOUNDATION","INTERMEDIATE","PRO"].map(d =>
  sharp(dir + `runtime_scaffold_${d}.png`).extract({ left: 0, top: 236, width: 490, height: 300 }).toBuffer()));
await sharp({ create: { width: 490, height: 300 * 3 + 32, channels: 3, background: "#0b0a08" } })
  .composite(crops.map((c, i) => ({ input: c, top: i * (300 + 16), left: 0 }))).png().toFile(dir + "runtime_scaffold_triptych.png");
