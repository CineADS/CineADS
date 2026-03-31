import { describe, it, expect } from "vitest";
import { calculateNewPrice, checkMarginProtection } from "@/lib/priceRulesEngine";

describe("calculateNewPrice", () => {
  it("percent_increase: 100 + 10% = 110", () => {
    expect(calculateNewPrice(100, "percent_increase", 10)).toBeCloseTo(110);
  });

  it("percent_decrease: 100 - 20% = 80", () => {
    expect(calculateNewPrice(100, "percent_decrease", 20)).toBe(80);
  });

  it("fixed_increase: 100 + 15 = 115", () => {
    expect(calculateNewPrice(100, "fixed_increase", 15)).toBe(115);
  });

  it("fixed_decrease: 100 - 30 = 70", () => {
    expect(calculateNewPrice(100, "fixed_decrease", 30)).toBe(70);
  });

  it("fixed_decrease should not go below 0", () => {
    expect(calculateNewPrice(10, "fixed_decrease", 20)).toBe(0);
  });

  it("fixed_price: returns the value directly", () => {
    expect(calculateNewPrice(100, "fixed_price", 50)).toBe(50);
  });

  it("unknown type returns current price", () => {
    expect(calculateNewPrice(100, "unknown", 10)).toBe(100);
  });
});

describe("checkMarginProtection", () => {
  it("blocks price below min_price", () => {
    expect(checkMarginProtection(5, 3, 0, 10)).toBe(false);
  });

  it("allows price above min_price with no margin requirement", () => {
    expect(checkMarginProtection(15, 0, 0, 10)).toBe(true);
  });

  it("blocks price with margin below min_margin_percent", () => {
    // price=100, cost=95 → margin=5%
    expect(checkMarginProtection(100, 95, 10, 0)).toBe(false);
  });

  it("allows price with margin above min_margin_percent", () => {
    // price=100, cost=50 → margin=50%
    expect(checkMarginProtection(100, 50, 10, 0)).toBe(true);
  });
});
