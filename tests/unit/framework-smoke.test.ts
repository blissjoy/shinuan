import { describe, expect, it } from 'vitest';

describe('Vitest framework smoke', () => {
  it('runs a minimal assertion', () => {
    expect([1, 2, 3].reduce((sum, n) => sum + n, 0)).toBe(6);
  });
});
