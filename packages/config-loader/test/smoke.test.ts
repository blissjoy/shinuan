import { describe, expect, it } from 'vitest';
import { CONFIG_LOADER_PACKAGE_NAME } from '../src/index';

describe('@shinuan/config-loader smoke', () => {
  it('exposes the package entry point', () => {
    expect(CONFIG_LOADER_PACKAGE_NAME).toBe('@shinuan/config-loader');
  });
});
