'use server';

import {nexconn} from '@/lib/chat/server';
import {db} from '@/lib/db/client';
import {extendWindow, verifyEntry} from '@/lib/follow-ups/lifecycle';
import {chargeMockPayment} from '@/lib/mock-payment';
import {getPatientSessionFollowUp, setPatientSessionCookie} from '@/lib/patient-session';

// Patient actions. Patients have no account: the link token finds the
// follow-up, and the session cookie proves the phone digits were confirmed.

/**
 * Checks the last 4 digits of the phone and the consent tick. After 5 wrong
 * tries the link is locked for 15 minutes. On success this browser gets a
 * session for this one follow-up.
 */
export async function confirmEntry(token: unknown, digits: unknown, hasConsented: unknown) {
  const result = await verifyEntry(db, token, digits, hasConsented);
  if (!result.ok) return result;

  await setPatientSessionCookie(token as string, result.sessionToken);
  return {ok: true as const};
}

/**
 * Reopens a follow-up that ran out of time for 7 days, after a mock payment.
 * Needs a patient session for this link's follow-up.
 */
export async function extendFollowUp(token: unknown) {
  const followUpId =
    typeof token === 'string' ? await getPatientSessionFollowUp(token) : undefined;
  if (!followUpId) return {ok: false as const, reason: 'no_session' as const};

  return extendWindow(db, followUpId, chargeMockPayment, nexconn);
}
