import { redirect } from "next/navigation";

/**
 * /settings IS NOT A PAGE. Settings is the shell's drawer. The edge answers
 * this path with a real 308 to /charts?settings=open
 * (`@/lib/legacyRouteAliases`), and ShellAccessChrome opens the drawer from
 * that query. This stub is the fallback if the middleware matcher narrows.
 */
export default function SettingsAlias() {
  redirect("/charts?settings=open");
}
