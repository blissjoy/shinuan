/**
 * SHINUAN-S1-01 商品定價級距常數測試（Master PRD v2.1.29 §8.C.2）。
 * 預期值逐列對應 PRD「商品定價級距與固定效果白名單驗證準則」表，嚴禁調整。
 */
import { describe, expect, it } from 'vitest';
import { FOOD_PRICE_TIER_RULES, type PriceTierRule } from '../src/index';

const r = (min: number, max: number = min) => ({ min, max });

const EXPECTED: readonly PriceTierRule[] = [
  { category: 'water', tier: 'free_basic', price: r(0), hunger: r(0), hydration: r(32), mood: r(2) },
  { category: 'kibble', tier: 'free_basic', price: r(0), hunger: r(25), hydration: r(-2), mood: r(2) },
  {
    category: 'kibble',
    tier: 'paid_advanced',
    price: r(80, 110),
    hunger: r(26, 28),
    hydration: r(-2, -1),
    mood: r(5, 6),
  },
  {
    category: 'wet_food',
    tier: 'entry',
    price: r(50, 70),
    hunger: r(25),
    hydration: r(20, 21),
    mood: r(5, 6),
  },
  {
    category: 'wet_food',
    tier: 'standard',
    price: r(71, 95),
    hunger: r(25, 27),
    hydration: r(20, 22),
    mood: r(7, 8),
  },
  {
    category: 'wet_food',
    tier: 'premium',
    price: r(96, 120),
    hunger: r(27, 28),
    hydration: r(20, 22),
    mood: r(8, 9),
  },
  { category: 'treat', tier: 'standard', price: r(40, 60), hunger: r(8), hydration: r(-1), mood: r(14) },
];

describe('FOOD_PRICE_TIER_RULES（PRD §8.C.2 7 個級距）', () => {
  it('恰 7 列且逐列上下限與 PRD 完全一致', () => {
    expect(FOOD_PRICE_TIER_RULES).toHaveLength(7);
    expect(FOOD_PRICE_TIER_RULES).toEqual(EXPECTED);
  });

  it('每個區間 min <= max', () => {
    for (const rule of FOOD_PRICE_TIER_RULES) {
      for (const key of ['price', 'hunger', 'hydration', 'mood'] as const) {
        expect(rule[key].min).toBeLessThanOrEqual(rule[key].max);
      }
    }
  });

  it('同類別 (category, tier) 不重複', () => {
    const keys = FOOD_PRICE_TIER_RULES.map((rule) => `${rule.category}:${rule.tier}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('常數表與各列皆為不可變', () => {
    expect(Object.isFrozen(FOOD_PRICE_TIER_RULES)).toBe(true);
    for (const rule of FOOD_PRICE_TIER_RULES) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(Object.isFrozen(rule.price)).toBe(true);
      expect(Object.isFrozen(rule.hunger)).toBe(true);
      expect(Object.isFrozen(rule.hydration)).toBe(true);
      expect(Object.isFrozen(rule.mood)).toBe(true);
    }
  });
});
