/**
 * KeyRotator.test.ts — Unit tests for the metadata rotation engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { KeyRotator } from "../lib/KeyRotator";
import type { ApiKeyEntry } from "../lib/KeyRotator";

const makeKey = (id: string, name: string): ApiKeyEntry => ({
  id,
  name,
  status: "unchecked",
});

describe("KeyRotator", () => {
  let keys: ApiKeyEntry[];

  beforeEach(() => {
    keys = [
      makeKey("1", "Key A"),
      makeKey("2", "Key B"),
      makeKey("3", "Key C"),
    ];
  });

  it("returns null when no keys are provided", () => {
    const rotator = new KeyRotator([]);
    expect(rotator.getNextKey()).toBeNull();
    expect(rotator.getActiveKey()).toBeNull();
  });

  it("cycles through keys in round-robin order (Unlimited mode)", () => {
    const rotator = new KeyRotator(keys);
    expect(rotator.getNextKey()?.id).toBe("1");
    expect(rotator.getNextKey()?.id).toBe("2");
    expect(rotator.getNextKey()?.id).toBe("3");
    expect(rotator.getNextKey()?.id).toBe("1"); // wraps
  });

  it("getActiveKey always returns the first active key (Normal mode)", () => {
    const rotator = new KeyRotator(keys);
    expect(rotator.getActiveKey()?.id).toBe("1");
    expect(rotator.getActiveKey()?.id).toBe("1"); // deterministic
  });

  it("skips rate-limited keys in round-robin", () => {
    const rotator = new KeyRotator(keys);
    rotator.reportRateLimit("1", 999_999); // long cooldown
    // Key A should be excluded from active pool
    expect(rotator.getNextKey()?.id).toBe("2");
    expect(rotator.getNextKey()?.id).toBe("3");
    expect(rotator.getNextKey()?.id).toBe("2"); // only B and C active
  });

  it("skips invalid keys", () => {
    const rotator = new KeyRotator(keys);
    rotator.reportInvalid("2");
    const results = [rotator.getNextKey()?.id, rotator.getNextKey()?.id, rotator.getNextKey()?.id];
    expect(results).not.toContain("2");
  });

  it("reinstates a key after reportValid", () => {
    const rotator = new KeyRotator(keys);
    rotator.reportRateLimit("1", 999_999);
    rotator.reportValid("1");
    const results = new Set([rotator.getNextKey()?.id, rotator.getNextKey()?.id, rotator.getNextKey()?.id]);
    expect(results.has("1")).toBe(true);
  });

  it("returns null when all keys are invalid", () => {
    const rotator = new KeyRotator(keys);
    rotator.reportInvalid("1");
    rotator.reportInvalid("2");
    rotator.reportInvalid("3");
    expect(rotator.getNextKey()).toBeNull();
    expect(rotator.getActiveKey()).toBeNull();
  });

  it("reports correct healthy key count", () => {
    const rotator = new KeyRotator(keys);
    expect(rotator.healthyCount).toBe(3);
    rotator.reportInvalid("1");
    expect(rotator.healthyCount).toBe(2);
    rotator.reportRateLimit("2", 999_999);
    expect(rotator.healthyCount).toBe(1);
  });
});
