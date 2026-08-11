const SMART_MONEY_MODAL_BREAKPOINT = 1024;
const SMART_MONEY_DESKTOP_TOP = 172;
const SMART_MONEY_MOBILE_TOP = 64;

export function getSmartMoneyPanelLayout(viewportWidth: number) {
  const modal = viewportWidth < SMART_MONEY_MODAL_BREAKPOINT;
  const top = modal ? SMART_MONEY_MOBILE_TOP : SMART_MONEY_DESKTOP_TOP;
  return { modal, top, height: `calc(100dvh - ${top}px)` } as const;
}
