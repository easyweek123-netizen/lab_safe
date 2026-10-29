/**
 * `pnpm qa:serve` (E01 design §5, S01.3 AC4): runs after `pnpm build` and `pnpm test:db:prepare`.
 * Starts the built app on :4100 with the test settings, prints its address once it answers, and
 * keeps it running until Ctrl+C. Run with `tsx` from the repository root, so the relative paths in
 * `TEST_ENV` resolve against it.
 */
import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import { TEST_BASE_URL, TEST_ENV } from './test-env';

const HEALTH_URL = `${TEST_BASE_URL}/api/health`;
const POLL_INTERVAL_MS = 250;
const READY_TIMEOUT_MS = 30_000;
const NOT_STARTED_MESSAGE = 'The QA server did not start. Is port 4100 already in use?';
const TIMED_OUT_MESSAGE = `The QA server did not answer ${HEALTH_URL} within 30 s.`;

/** starting → running (answers) | stopping (Ctrl+C) | timed-out; the child's exit ends every state. */
type State = 'starting' | 'running' | 'stopping' | 'timed-out';

/** True when the health endpoint answers 200. Any network error counts as "not yet". */
async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(1_000) });
    return response.status === 200;
  } catch {
    return false;
  }
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/** The exit code to pass on: the child's own code, or 128 + the signal number that stopped it. */
function exitCodeOf(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  if (signal !== null) return 128 + (constants.signals[signal] ?? 0);
  return 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  // Another server already answering on :4100 would otherwise be announced as this one.
  if (await isHealthy()) fail(NOT_STARTED_MESSAGE);

  // The test values always win over the shell's environment.
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
    env: { ...process.env, ...TEST_ENV },
    stdio: 'inherit',
  });

  let state: State = 'starting';
  let exited = false;

  child.on('exit', (code, signal) => {
    exited = true;
    if (state === 'starting') fail(NOT_STARTED_MESSAGE);
    if (state === 'timed-out') process.exit(1);
    process.exit(exitCodeOf(code, signal));
  });

  // Ctrl+C or a stop request: pass it on; the process exits with the child (above).
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      if (exited) return;
      if (state !== 'timed-out') state = 'stopping';
      child.kill(signal);
    });
  }

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (state === 'starting' && !exited) {
    if (await isHealthy()) {
      if (state !== 'starting' || exited) return;
      state = 'running';
      process.stdout.write(`QA server: ${TEST_BASE_URL}\n`);
      return;
    }
    if (Date.now() >= deadline) {
      state = 'timed-out';
      process.stderr.write(`${TIMED_OUT_MESSAGE}\n`);
      child.kill('SIGTERM');
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

void main();
