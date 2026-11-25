import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findBlockedPushes, runPrePushGuard } from '../../scripts/pre-push-guard.mjs';

const SCRIPT = fileURLToPath(new URL('../../scripts/pre-push-guard.mjs', import.meta.url));
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const ZERO = '0'.repeat(40);

function runScript(stdin: string) {
  return spawnSync(process.execPath, [SCRIPT, 'origin', 'https://example.invalid/repo.git'], {
    input: stdin,
    encoding: 'utf8',
  });
}

describe('pre-push-guard: findBlockedPushes', () => {
  it('blocks a push to refs/heads/master', () => {
    const stdin = `refs/heads/master ${SHA_A} refs/heads/master ${SHA_B}\n`;
    expect(findBlockedPushes(stdin)).toEqual([
      { localRef: 'refs/heads/master', remoteRef: 'refs/heads/master' },
    ]);
  });

  it('blocks a feature branch pushed onto remote master', () => {
    const stdin = `refs/heads/infra/issue-1 ${SHA_A} refs/heads/master ${SHA_B}\n`;
    expect(findBlockedPushes(stdin)).toHaveLength(1);
  });

  it('blocks deleting remote master', () => {
    const stdin = `(delete) ${ZERO} refs/heads/master ${SHA_B}\n`;
    expect(findBlockedPushes(stdin)).toHaveLength(1);
  });

  it('allows a task branch', () => {
    const stdin = `refs/heads/infra/issue-1-phase-a-bootstrap ${SHA_A} refs/heads/infra/issue-1-phase-a-bootstrap ${ZERO}\n`;
    expect(findBlockedPushes(stdin)).toEqual([]);
  });

  it('does not treat lookalike refs as master', () => {
    const stdin = [
      `refs/heads/master-backup ${SHA_A} refs/heads/master-backup ${ZERO}`,
      `refs/heads/feature/master ${SHA_A} refs/heads/feature/master ${ZERO}`,
      `refs/tags/master ${SHA_A} refs/tags/master ${ZERO}`,
    ].join('\r\n');
    expect(findBlockedPushes(stdin)).toEqual([]);
  });

  it('blocks when any line of a multi-ref push targets master', () => {
    const stdin = [
      `refs/heads/infra/x ${SHA_A} refs/heads/infra/x ${ZERO}`,
      `refs/heads/master ${SHA_A} refs/heads/master ${SHA_B}`,
    ].join('\n');
    expect(runPrePushGuard(stdin)).toBe(1);
  });

  it('allows empty input', () => {
    expect(runPrePushGuard('')).toBe(0);
  });
});

describe('pre-push-guard: CLI exit codes', () => {
  it('exits 1 for a push to refs/heads/master', () => {
    const result = runScript(`refs/heads/master ${SHA_A} refs/heads/master ${SHA_B}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('refs/heads/master');
  });

  it('exits 0 for a feature branch push', () => {
    const result = runScript(
      `refs/heads/infra/issue-1-phase-a-bootstrap ${SHA_A} refs/heads/infra/issue-1-phase-a-bootstrap ${ZERO}\n`,
    );
    expect(result.status).toBe(0);
  });
});
