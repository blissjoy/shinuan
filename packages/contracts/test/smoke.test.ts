import { describe, expect, it } from 'vitest';
import { CONTRACTS_PACKAGE_NAME } from '../src/index';

describe('@shinuan/contracts smoke', () => {
  it('exposes the package entry point', () => {
    expect(CONTRACTS_PACKAGE_NAME).toBe('@shinuan/contracts');
  });
});
