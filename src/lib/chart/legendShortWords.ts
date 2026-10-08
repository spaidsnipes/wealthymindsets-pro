/**
 * THE NARROW-GLASS SHORT FORM of the chart legend's long qualifiers (cert lane,
 * serving /desk 4-up at 1180, 2026-10-07 night: "377.78 LAST 5m BAR CLOSE" and
 * "-0.14 (-0.04%) vs prior 5m bar" ran over the price axis in ~550 px panes).
 *
 * The owners' sentences (chartHeaderPriceFact / chartHeaderChangeFact) are not
 * changed and stay in each cell's aria-label and in the DOM; a legend band under
 * 760 px (the `wm-legend` container) SHOWS this form instead. The scope words
 * survive in short: a bar close still says it is a bar close, a bar-over-bar
 * change still says it is per bar — never a bare number that could read as a
 * live quote or a session change.
 */
export function legendShortWords(text: string): string {
  return text
    .replace(/ LAST (\S+) BAR CLOSE$/, " · $1 CLOSE")
    .replace(/ vs prior (\S+) bar$/, " /$1 bar");
}
