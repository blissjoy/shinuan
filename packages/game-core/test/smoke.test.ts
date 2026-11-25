import { describe, expect, it } from 'vitest';
import { GAME_CORE_PACKAGE_NAME } from '../src/index';

describe('@shinuan/game-core smoke', () => {
  it('exposes the package entry point', () => {
    expect(GAME_CORE_PACKAGE_NAME).toBe('@shinuan/game-core');
  });
});
