import { describe, it, expect } from "vitest";
import { insertCustomerSchema } from "./schema";

describe("insertCustomerSchema", () => {
  it("accepts a valid customer", () => {
    const result = insertCustomerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when required fields are missing", () => {
    const result = insertCustomerSchema.safeParse({ name: "Jane Doe" });
    expect(result.success).toBe(false);
  });
});
