import { describe, expect, it } from 'vitest';
import { renderStatusPage } from '../src/status';

describe('@shinuan/local-sandbox smoke', () => {
  it('renders a healthy status page', () => {
    const html = renderStatusPage();
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Health check: OK');
  });

  it('escapes HTML in status fields', () => {
    const html = renderStatusPage({ name: '<b>x</b>', phase: 'A', healthy: false });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('Health check: NOT OK');
  });
});
