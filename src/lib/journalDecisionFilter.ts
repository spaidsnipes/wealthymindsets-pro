const MAX_LINKED_DECISIONS = 50;
const MAX_DECISION_ID_LENGTH = 128;

export function parseLinkedDecisionIds(value: string | null): readonly string[] {
  if (value == null) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value.split(",")) {
    const id = candidate.trim();
    if (
      !id ||
      id.length > MAX_DECISION_ID_LENGTH ||
      /[\u0000-\u001f\u007f]/.test(id) ||
      seen.has(id)
    ) continue;

    seen.add(id);
    ids.push(id);
    if (ids.length === MAX_LINKED_DECISIONS) break;
  }
  return ids;
}

export function filterLinkedDecisionEntries<T extends { id: string }>(
  entries: readonly T[],
  ids: readonly string[],
  active: boolean,
): readonly T[] {
  if (!active) return entries;
  const allowed = new Set(ids);
  return entries.filter(entry => allowed.has(entry.id));
}

export function withoutLinkedDecisions(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("decisions");
  const query = params.toString();
  return query ? `/journal?${query}` : "/journal";
}
