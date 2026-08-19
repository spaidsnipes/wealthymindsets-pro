export const PROFILE_TABS = ["growth", "trades", "nectar", "music", "posts", "coins"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function parseProfileTab(value: string | null): ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "trades";
}

export function profileTabHref(search: string, tab: ProfileTab): string {
  const params = new URLSearchParams(search);
  params.set("tab", tab);
  return `/profile?${params.toString()}`;
}
