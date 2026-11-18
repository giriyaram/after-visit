import 'server-only';
import {db} from '@/lib/db/client';
import {msUntilNextWindowEnd, muteEndedWindows} from './channel';
import {nexconn} from './server';

// Closes the chat at `ends_at` with nobody watching. Each run mutes every
// ended follow-up's patient, then sleeps until the next open follow-up ends,
// so the mute lands about a second after the end. It wakes at least every
// MAX_SLEEP_MS to notice follow-ups opened since, which matters only for
// windows shorter than that: the 2-minute dev window, never in production.
// Started once per server process by instrumentation.ts. A long-running
// server (`next dev`, `next start`) keeps it alive; a serverless host would
// need a scheduler to call muteEndedWindows instead.

const MAX_SLEEP_MS = process.env.NODE_ENV === 'production' ? 10 * 60_000 : 60_000;
const RETRY_MS = 30_000;
/** Past `ends_at`, so the database agrees the window has closed. */
const AFTER_END_MS = 1_000;

const state = globalThis as unknown as {chatSweeperStarted?: boolean};

async function run() {
  let delay = MAX_SLEEP_MS;
  try {
    const {failed} = await muteEndedWindows(db, nexconn);
    const untilEnd = await msUntilNextWindowEnd(db);
    if (untilEnd !== undefined) delay = Math.min(delay, untilEnd + AFTER_END_MS);
    if (failed > 0) delay = Math.min(delay, RETRY_MS);
  } catch (error) {
    console.error('Chat sweeper run failed; retrying shortly.', error);
    delay = RETRY_MS;
  }
  setTimeout(run, delay).unref();
}

/** Starts the sweeper once per process; later calls do nothing. */
export function startChatSweeper() {
  if (state.chatSweeperStarted) return;
  state.chatSweeperStarted = true;
  void run();
}
