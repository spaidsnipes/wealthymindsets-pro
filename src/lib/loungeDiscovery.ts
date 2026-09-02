export interface LoungeDiscoveryPost {
  readonly user_handle: string;
  readonly user_name: string;
  readonly user_avatar: string;
  readonly user_color: string;
  readonly user_ceo: boolean;
  readonly tags?: readonly string[];
}

export interface LoungeDiscoveryPerson {
  readonly handle: string;
  readonly name: string;
  readonly avatar: string;
  readonly color: string;
  readonly ceo: boolean;
  readonly count: number;
}

export interface LoungeDiscovery {
  readonly people: readonly LoungeDiscoveryPerson[];
  readonly tags: readonly (readonly [tag: string, count: number])[];
  readonly hasDiscovery: boolean;
}

/** Empty discovery never reserves permanent product space. */
export function selectLoungeDiscovery(
  posts: readonly LoungeDiscoveryPost[],
  myHandle: string,
): LoungeDiscovery {
  const peopleByHandle = new Map<string, LoungeDiscoveryPerson>();
  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    const existing = peopleByHandle.get(post.user_handle);
    peopleByHandle.set(post.user_handle, existing
      ? { ...existing, count: existing.count + 1 }
      : {
          handle: post.user_handle,
          name: post.user_name,
          avatar: post.user_avatar,
          color: post.user_color,
          ceo: post.user_ceo,
          count: 1,
        });
    for (const rawTag of post.tags ?? []) {
      const tag = rawTag.trim();
      if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const people = Array.from(peopleByHandle.values())
    .filter(person => person.handle !== myHandle)
    .sort((a, b) => b.count - a.count || a.handle.localeCompare(b.handle))
    .slice(0, 4);
  const tags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);

  return { people, tags, hasDiscovery: people.length > 0 || tags.length > 0 };
}
