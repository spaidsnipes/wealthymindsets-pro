import { describe, expect, it } from "vitest";
import { selectLoungeDiscovery, type LoungeDiscoveryPost } from "./loungeDiscovery";

const post = (user_handle: string, tags: readonly string[] = []): LoungeDiscoveryPost => ({
  user_handle,
  user_name: user_handle,
  user_avatar: "",
  user_color: "#000",
  user_ceo: false,
  tags,
});

describe("selectLoungeDiscovery", () => {
  it("keeps the rail absent when there is no real discovery content", () => {
    expect(selectLoungeDiscovery([], "founder")).toEqual({ people: [], tags: [], hasDiscovery: false });
  });

  it("does not recommend the current member to themselves", () => {
    const view = selectLoungeDiscovery([post("founder")], "founder");
    expect(view.people).toEqual([]);
    expect(view.hasDiscovery).toBe(false);
  });

  it("admits populated sections independently", () => {
    const tagsOnly = selectLoungeDiscovery([post("founder", ["#NQ"])], "founder");
    expect(tagsOnly.people).toEqual([]);
    expect(tagsOnly.tags).toEqual([["#NQ", 1]]);
    expect(tagsOnly.hasDiscovery).toBe(true);

    const peopleOnly = selectLoungeDiscovery([post("trader")], "founder");
    expect(peopleOnly.people[0]).toMatchObject({ handle: "trader", count: 1 });
    expect(peopleOnly.tags).toEqual([]);
  });

  it("ranks real people and tags deterministically within the existing limits", () => {
    const posts = [
      post("beta", ["#ES", "#NQ"]),
      post("alpha", ["#NQ"]),
      post("beta", ["#ES"]),
      ...Array.from({ length: 10 }, (_, i) => post(`member-${i}`, [`#TAG${i}`])),
    ];
    const view = selectLoungeDiscovery(posts, "founder");
    expect(view.people).toHaveLength(4);
    expect(view.people[0]).toMatchObject({ handle: "beta", count: 2 });
    expect(view.tags).toHaveLength(8);
    expect(view.tags[0]).toEqual(["#ES", 2]);
    expect(view.tags[1]).toEqual(["#NQ", 2]);
  });
});
