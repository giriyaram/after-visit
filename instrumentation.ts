import {PHASE_PRODUCTION_BUILD} from 'next/constants';

// Runs once when a server process starts. Starts the chat sweeper, which
// mutes patients when their window ends (lib/chat/sweeper.ts). Node only,
// and not while `next build` prerenders.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return;
  const {startChatSweeper} = await import('./lib/chat/sweeper');
  startChatSweeper();
}
