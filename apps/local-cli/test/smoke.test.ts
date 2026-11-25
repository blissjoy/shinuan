import { describe, expect, it } from 'vitest';
import { buildCliBanner } from '../src/banner';

describe('@shinuan/local-cli smoke', () => {
  it('builds the startup banner', () => {
    expect(buildCliBanner()).toContain('local-cli');
  });
});
