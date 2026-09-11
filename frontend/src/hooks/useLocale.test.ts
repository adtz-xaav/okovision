import { describe, expect, it } from "vitest";
import { format } from "./useLocale";

describe("format", () => {
  it("interpolates named placeholders", () => {
    expect(format("Signed in as {email} ({role})", { email: "owner@example.com", role: "ADMIN" })).toBe(
      "Signed in as owner@example.com (ADMIN)",
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(format("Hello {name}", {})).toBe("Hello {name}");
  });
});
