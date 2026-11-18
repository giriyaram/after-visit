import 'server-only';
import {cookies} from 'next/headers';
import {db} from './db/client';
import {findSessionFollowUp, PATIENT_SESSION_DAYS} from './follow-ups/lifecycle';

const COOKIE_NAME = 'av_patient_session';

// The cookie is limited to its own link's pages, so the browser never sends
// one follow-up's session to another follow-up's link.
const cookiePath = (token: string) => `/visit/${encodeURIComponent(token)}`;

/** Stores a new patient session in the browser. Server actions only. */
export async function setPatientSessionCookie(token: string, sessionToken: string) {
  (await cookies()).set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: cookiePath(token),
    maxAge: PATIENT_SESSION_DAYS * 24 * 60 * 60,
  });
}

/** The raw session cookie value, for lifecycle functions that hash it. */
export async function getPatientSessionToken() {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

/**
 * The id of the follow-up this browser has confirmed the phone digits for,
 * if it is the one the link token points at. Otherwise undefined.
 */
export async function getPatientSessionFollowUp(token: string) {
  return findSessionFollowUp(db, token, await getPatientSessionToken());
}
