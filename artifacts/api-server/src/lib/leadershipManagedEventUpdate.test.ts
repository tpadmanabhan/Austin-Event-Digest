import { describe, expect, it } from "vitest";
import { parseLeadershipManagedEventUpdate } from "./leadershipManagedEventUpdate";

describe("managed community event updates", () => {
  it("allows Golf description edits and trims surrounding whitespace", () => {
    expect(parseLeadershipManagedEventUpdate("golf", {
      description: "  Three playing spots are open.  ",
    })).toEqual({ description: "Three playing spots are open." });
  });

  it("rejects source attribution edits and empty descriptions for Golf", () => {
    expect(parseLeadershipManagedEventUpdate("golf", { sourceAlumni: "Alex" })).toBeNull();
    expect(parseLeadershipManagedEventUpdate("golf", { description: "   " })).toBeNull();
  });

  it("keeps source-person edits for Leadership Austin", () => {
    expect(parseLeadershipManagedEventUpdate("leadershipaustin", {
      sourceAlumni: "  Alex  ",
    })).toEqual({ sourceAlumni: "Alex" });
  });

  it("rejects description edits for non-Golf tenants", () => {
    expect(parseLeadershipManagedEventUpdate("leadershipaustin", {
      description: "Updated description",
    })).toBeNull();
  });
});
