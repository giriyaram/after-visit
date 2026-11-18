'use server';

import {nexconn} from '@/lib/chat/server';
import {getCurrentStaff} from '@/lib/current-staff';
import {db} from '@/lib/db/client';
import {
  closeEarly as closeFollowUpEarly,
  createFollowUp,
  regenerateLinkToken,
  setFlag,
} from '@/lib/follow-ups/lifecycle';

// Staff actions. Each one checks the session first; with no session,
// getCurrentStaff() redirects to the sign-in page and nothing else runs.
// The clinic always comes from the session, never from the arguments.

const linkPath = (token: string) => `/visit/${token}`;

/**
 * Opens a follow-up and its chat channel. `linkPath` is the patient's
 * private link; it is returned this once and cannot be read again, only
 * regenerated.
 */
export async function openFollowUp(input: unknown) {
  const staff = await getCurrentStaff();
  // The 2-minute window exists to watch the end of a window happen. Never
  // in production.
  const result = await createFollowUp(db, staff, input, nexconn, {
    allowDevWindow: process.env.NODE_ENV !== 'production',
  });
  if (!result.ok) return result;
  return {ok: true as const, id: result.id, linkPath: linkPath(result.token)};
}

/**
 * Replaces the patient link. The old one stops working at once, and the
 * chat drops whoever was in it through the old link. `isChatRevoked` false
 * means Nexconn was unreachable; regenerating again retries.
 */
export async function regenerateLink(followUpId: unknown) {
  const staff = await getCurrentStaff();
  const result = await regenerateLinkToken(db, staff, followUpId, nexconn);
  if (!result.ok) return result;
  return {ok: true as const, linkPath: linkPath(result.token), isChatRevoked: result.isChatRevoked};
}

/** Sets or clears the doctor flag on an open follow-up. */
export async function setFlagForDoctor(followUpId: unknown, isFlagged: unknown) {
  const staff = await getCurrentStaff();
  return setFlag(db, staff, followUpId, isFlagged);
}

/** Ends an open follow-up now and mutes the patient in its chat. */
export async function closeEarly(followUpId: unknown) {
  const staff = await getCurrentStaff();
  return closeFollowUpEarly(db, staff, followUpId, nexconn);
}
