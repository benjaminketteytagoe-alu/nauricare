import { describe, expect, it } from "vitest";
import { communityAvatar, isGooglePhoto, presetIdOf, presetSrc } from "./avatars";

describe("avatars", () => {
  it("recognises only the predefined presets", () => {
    expect(presetIdOf(presetSrc("locs"))).toBe("locs");
    expect(presetIdOf("/avatars/unknown.svg")).toBeNull();
    expect(presetIdOf("/avatars/locs.svg?x=1")).toBeNull();
    expect(presetIdOf("https://evil.example/avatars/locs.svg")).toBeNull();
    expect(presetIdOf(null)).toBeNull();
  });

  it("recognises Google profile photos over https only", () => {
    expect(isGooglePhoto("https://lh3.googleusercontent.com/a/abc")).toBe(true);
    expect(isGooglePhoto("https://lh5.googleusercontent.com/a/abc")).toBe(true);
    expect(isGooglePhoto("http://lh3.googleusercontent.com/a/abc")).toBe(false);
    expect(isGooglePhoto("https://lh3.googleusercontent.com.evil.example/a")).toBe(false);
    expect(isGooglePhoto("not a url")).toBe(false);
  });

  it("never shows a patient's real photo in the community", () => {
    expect(communityAvatar("PATIENT", "https://lh3.googleusercontent.com/a/abc")).toBeNull();
    expect(communityAvatar("PATIENT", "/avatars/gele.svg")).toBe("/avatars/gele.svg");
    expect(communityAvatar("PROVIDER", "https://lh3.googleusercontent.com/a/abc")).toBe(
      "https://lh3.googleusercontent.com/a/abc",
    );
    expect(communityAvatar("PROVIDER", undefined)).toBeNull();
  });
});
