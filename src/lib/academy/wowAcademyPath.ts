/**
 * ONE EDUCATION OWNER: WOW ACADEMY (Founder 2026-10-17: "all those lessons … everything that has that
 * information symbol on it … needs to be inside of this A+ Student of the Game"; Garden 19: the Academy is
 * WOW Academy, owned by WOW OS, no duplicate backends).
 *
 * WM Pro's lessons now live at thewow.online/academy/a-plus — the tool primers as "Reading the glass"
 * (/academy/a-plus/glass/<slug>, the same ⓘ words, exported with their commit) and the FVG course
 * (/academy/a-plus/fvg/<n>). Every old /education lesson id maps to the WOW page that teaches it, so no
 * existing link breaks and nothing lands on a second, older catalogue.
 */
const LEGACY: Readonly<Record<string, string>> = {
  "sm-1": "/academy/a-plus/glass/absorption",
  "sm-2": "/academy/a-plus/glass/exhaustion",
  "sm-6": "/academy/a-plus/glass/footprint",
  "fp-1": "/academy/a-plus/glass/footprint",
  "fp-2": "/academy/a-plus/glass/footprint",
  "fp-3": "/academy/a-plus/glass/imbalance-stack",
  "fp-4": "/academy/a-plus/glass/session",
  "fp-5": "/academy/a-plus/glass/cvd-notch",
  "clc-1": "/academy/a-plus/permission",
  "clc-2": "/academy/a-plus/direction",
  "clc-3": "/academy/a-plus/location",
  "clc-4": "/academy/a-plus/response",
  "clc-5": "/academy/a-plus/permission",
  "clc-6": "/academy/a-plus/full-process",
};
const PREFIX: readonly (readonly [RegExp, string])[] = [
  [/^of-/, "/academy/a-plus/glass/footprint"],
  [/^fp-/, "/academy/a-plus/glass/footprint"],
  [/^sm-/, "/academy/a-plus/glass/library?q=smart"],
  [/^dp-/, "/academy/a-plus/glass/library?q=iceberg"],
  [/^vw-/, "/academy/a-plus/glass/library?q=vwap"],
  [/^wy-/, "/academy/a-plus/glass/regime-lighting"],
  [/^clc-/, "/academy/a-plus/permission"],
];

export const WOW_ACADEMY_HOME = "/academy/a-plus/glass" as const;

/** The WOW Academy path that teaches an old /education lesson id (or the glass school when there is none). */
export function wowAcademyPath(lessonId: string | null | undefined): string {
  const id = (lessonId ?? "").trim();
  const glass = /^glass-([a-z0-9-]{2,40})$/.exec(id);
  if (glass) return `/academy/a-plus/glass/${glass[1]}`;
  const fvg = /^fvg-(\d{1,2})$/.exec(id);
  if (fvg) return `/academy/a-plus/fvg/${fvg[1]}`;
  if (LEGACY[id]) return LEGACY[id];
  for (const [re, path] of PREFIX) if (re.test(id)) return path;
  return WOW_ACADEMY_HOME;
}

/** The lesson id an old /education href names (`/education?lesson=…`), or null. */
export function lessonIdFromHref(href: string): string | null {
  const q = href.split("?", 2)[1];
  return q ? new URLSearchParams(q).get("lesson") : null;
}
