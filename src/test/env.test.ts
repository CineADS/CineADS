import { describe, it, expect } from "vitest";
import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SUPABASE_PROJECT_ID: z.string().optional(),
});

describe("env validation", () => {
  it("should accept valid env", () => {
    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiJ9.test",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing URL", () => {
    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "key",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid URL", () => {
    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: "not-a-url",
      VITE_SUPABASE_PUBLISHABLE_KEY: "key",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing key", () => {
    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
    });
    expect(result.success).toBe(false);
  });
});
