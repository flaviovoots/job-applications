import { describe, expect, it } from "vitest";
import { cleanBullets } from "./bullets.js";

describe("cleanBullets", () => {
  it("moves an inline bullet onto its own line", () => {
    expect(cleanBullets("a•b")).toBe("a\n•b");
    expect(cleanBullets("a •b")).toBe("a\n•b");
    expect(cleanBullets("a\t•b")).toBe("a\n•b");
  });

  it("leaves a bullet already at the start of a line alone", () => {
    expect(cleanBullets("•a")).toBe("•a");
    expect(cleanBullets("a\n•b")).toBe("a\n•b");
  });

  it("gives the same result when run twice", () => {
    const once = cleanBullets("Duties: •one •two\t•three");
    expect(once).toBe("Duties:\n•one\n•two\n•three");
    expect(cleanBullets(once)).toBe(once);
  });

  it("leaves text with no bullet unchanged", () => {
    expect(cleanBullets("No bullets here.\n- a dash")).toBe(
      "No bullets here.\n- a dash",
    );
  });
});
