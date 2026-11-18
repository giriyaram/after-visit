// Everything that changes a follow-up. These functions hold the rules; the
// server actions only add the session check and the cookie.
//
// Staff functions take the `CurrentStaff` object, which only
// getCurrentStaff() produces, and never a bare clinic id. Nothing here
// imports Next, so the tests can call these directly.
import {and, eq, lt, sql} from 'drizzle-orm';
import type {NodePgQueryResultHKT} from 'drizzle-orm/node-postgres';
import type {PgDatabase} from 'drizzle-orm/pg-core';
import {ensureChannel, revokePatientChat, syncPatientGateQuietly} from '../chat/channel';
import type {NexconnServer} from '../chat/nexconn-server';
import type {CurrentStaff} from '../current-staff';
import {isOpen} from '../db/follow-up-state';
import {followUps, patientSessions, staff as staffTable} from '../db/schema';
import {generateToken, hashToken} from '../link-token';
import type {PaymentResult} from '../mock-payment';
import {isUuid, validateFollowUpInput, type FollowUpInputErrors} from './input';

/** The app's database or a transaction on it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<NodePgQueryResultHKT, any, any>;

export const MAX_ENTRY_ATTEMPTS = 5;
export const ENTRY_LOCK_MINUTES = 15;
export const EXTENSION_DAYS = 7;
export const PATIENT_SESSION_DAYS = 30;

/** The follow-up, only if it is in the staff member's clinic. */
export const inClinic = (staff: CurrentStaff, followUpId: string) =>
  and(eq(followUps.clinicId, staff.clinicId), eq(followUps.id, followUpId));

// ---------------------------------------------------------------- staff

export type CreateResult =
  | {ok: true; id: string; token: string}
  | {ok: false; reason: 'invalid'; errors: FollowUpInputErrors};

/**
 * Opens a follow-up in the staff member's clinic. The raw link token is
 * returned once and never stored; only its hash is. The chat channel is
 * created right after; if Nexconn is down the follow-up still exists and
 * the channel is created on the first chat load instead.
 */
export async function createFollowUp(
  db: Db,
  staff: CurrentStaff,
  input: unknown,
  nexconn: NexconnServer,
  options: {allowDevWindow?: boolean} = {},
): Promise<CreateResult> {
  const checked = validateFollowUpInput(input, options);
  if (!checked.ok) return {ok: false, reason: 'invalid', errors: checked.errors};
  const {values} = checked;

  // The assigned doctor must be a doctor in this clinic. The foreign key on
  // (clinic_id, doctor_id) backs up the clinic half of this.
  const [doctor] = await db
    .select({id: staffTable.id})
    .from(staffTable)
    .where(
      and(
        eq(staffTable.id, values.doctorId),
        eq(staffTable.clinicId, staff.clinicId),
        eq(staffTable.role, 'doctor'),
      ),
    );
  if (!doctor) {
    return {
      ok: false,
      reason: 'invalid',
      errors: {doctorId: 'Choose a doctor from this clinic.'},
    };
  }

  const token = generateToken();
  const [created] = await db
    .insert(followUps)
    .values({
      clinicId: staff.clinicId,
      doctorId: doctor.id,
      patientName: values.patientName,
      patientPhone: values.patientPhone,
      windowDays: values.windowDays,
      visitNote: values.visitNote,
      // Both ends of the window come from the database clock.
      startsAt: sql`now()`,
      endsAt: values.windowMinutes
        ? sql`now() + make_interval(mins => ${values.windowMinutes})`
        : sql`now() + make_interval(days => ${values.windowDays})`,
      linkTokenHash: hashToken(token),
    })
    .returning({id: followUps.id});

  try {
    await ensureChannel(db, nexconn, created.id);
  } catch (error) {
    console.error('Chat channel not created yet; it will be on the first chat load.', error);
  }

  return {ok: true, id: created.id, token};
}

export type RegenerateResult =
  /** `isChatRevoked` is false when Nexconn could not be reached; regenerating again retries it. */
  | {ok: true; token: string; isChatRevoked: boolean}
  | {ok: false; reason: 'not_found'};

/**
 * Replaces the patient link. The old link stops working at once, every
 * patient session for the follow-up ends, and the entry lock is cleared.
 * Then whoever was in the chat through the old link is cut off: their chat
 * tokens expire and their live connection is dropped.
 */
export async function regenerateLinkToken(
  db: Db,
  staff: CurrentStaff,
  followUpId: unknown,
  nexconn: NexconnServer,
): Promise<RegenerateResult> {
  if (!isUuid(followUpId)) return {ok: false, reason: 'not_found'};
  const token = generateToken();

  const result = await db.transaction(async tx => {
    const [updated] = await tx
      .update(followUps)
      .set({
        linkTokenHash: hashToken(token),
        failedVerifyAttempts: 0,
        verifyLockedUntil: null,
      })
      .where(inClinic(staff, followUpId))
      .returning({id: followUps.id});
    if (!updated) return {ok: false, reason: 'not_found'} as const;

    await tx.delete(patientSessions).where(eq(patientSessions.followUpId, updated.id));
    return {ok: true, id: updated.id} as const;
  });
  if (!result.ok) return result;

  // After the commit, so the old link can no longer fetch a fresh token.
  let isChatRevoked = true;
  try {
    await revokePatientChat(nexconn, result.id);
  } catch (error) {
    isChatRevoked = false;
    console.error('Chat access for the old link was not revoked; regenerate again to retry.', error);
  }
  return {ok: true, token, isChatRevoked};
}

export type StaffChangeResult =
  | {ok: true}
  | {ok: false; reason: 'not_found' | 'closed'};

// Why an update that needed an open follow-up changed nothing: the follow-up
// is closed, or it is not in this clinic (which reads as not found).
async function whyUnchanged(
  db: Db,
  staff: CurrentStaff,
  followUpId: string,
): Promise<StaffChangeResult> {
  const [row] = await db
    .select({id: followUps.id})
    .from(followUps)
    .where(inClinic(staff, followUpId));
  return {ok: false, reason: row ? 'closed' : 'not_found'};
}

/** Sets or clears the doctor flag. Only while the follow-up is open. */
export async function setFlag(
  db: Db,
  staff: CurrentStaff,
  followUpId: unknown,
  isFlagged: unknown,
): Promise<StaffChangeResult> {
  if (!isUuid(followUpId) || typeof isFlagged !== 'boolean') {
    return {ok: false, reason: 'not_found'};
  }

  // The open check is part of the same statement as the write.
  const [updated] = await db
    .update(followUps)
    .set({
      flaggedForDoctorAt: isFlagged
        ? sql`coalesce(${followUps.flaggedForDoctorAt}, now())`
        : null,
    })
    .where(and(inClinic(staff, followUpId), isOpen))
    .returning({id: followUps.id});

  return updated ? {ok: true} : whyUnchanged(db, staff, followUpId);
}

/**
 * Ends an open follow-up now. A patient cannot extend it afterwards. The
 * patient is muted in the chat straight after.
 */
export async function closeEarly(
  db: Db,
  staff: CurrentStaff,
  followUpId: unknown,
  nexconn: NexconnServer,
): Promise<StaffChangeResult> {
  if (!isUuid(followUpId)) return {ok: false, reason: 'not_found'};

  const [updated] = await db
    .update(followUps)
    .set({closedEarlyAt: sql`now()`})
    .where(and(inClinic(staff, followUpId), isOpen))
    .returning({id: followUps.id});
  if (!updated) return whyUnchanged(db, staff, followUpId);

  await syncPatientGateQuietly(db, nexconn, updated.id);
  return {ok: true};
}

// -------------------------------------------------------------- patient

export type EntryResult =
  | {ok: true; followUpId: string; sessionToken: string}
  | {ok: false; reason: 'invalid_link' | 'consent_required' | 'invalid_digits'}
  | {ok: false; reason: 'wrong_digits'; attemptsLeft: number}
  | {ok: false; reason: 'locked'; minutesLeft: number};

/**
 * Checks the last 4 digits of the phone for the follow-up a link points at.
 * On success it creates a patient session and returns its raw token, which
 * the caller puts in a cookie; only the hash is stored.
 */
export async function verifyEntry(
  db: Db,
  token: unknown,
  digits: unknown,
  hasConsented: unknown,
): Promise<EntryResult> {
  if (typeof digits !== 'string' || !/^\d{4}$/.test(digits)) {
    return {ok: false, reason: 'invalid_digits'};
  }
  if (hasConsented !== true) return {ok: false, reason: 'consent_required'};
  if (typeof token !== 'string' || !token) return {ok: false, reason: 'invalid_link'};

  return db.transaction(async tx => {
    // The row is locked until this transaction ends, so guesses sent at the
    // same moment are counted one after another.
    const [row] = await tx
      .select({
        id: followUps.id,
        attempts: followUps.failedVerifyAttempts,
        minutesLocked: sql<number>`greatest(ceil(extract(epoch from ${followUps.verifyLockedUntil} - now()) / 60), 0)::int`,
        isMatch: sql<boolean>`right(${followUps.patientPhone}, 4) = ${digits}`,
      })
      .from(followUps)
      .where(eq(followUps.linkTokenHash, hashToken(token)))
      .for('update');

    if (!row) return {ok: false, reason: 'invalid_link'} as const;

    // While locked the digits are not looked at, right or wrong.
    if (row.minutesLocked > 0) {
      return {ok: false, reason: 'locked', minutesLeft: row.minutesLocked} as const;
    }

    if (!row.isMatch) {
      const attempts = row.attempts + 1;
      const isLockedNow = attempts >= MAX_ENTRY_ATTEMPTS;
      await tx
        .update(followUps)
        .set({
          failedVerifyAttempts: isLockedNow ? 0 : attempts,
          verifyLockedUntil: isLockedNow
            ? sql`now() + make_interval(mins => ${ENTRY_LOCK_MINUTES})`
            : null,
        })
        .where(eq(followUps.id, row.id));

      return isLockedNow
        ? ({ok: false, reason: 'locked', minutesLeft: ENTRY_LOCK_MINUTES} as const)
        : ({
            ok: false,
            reason: 'wrong_digits',
            attemptsLeft: MAX_ENTRY_ATTEMPTS - attempts,
          } as const);
    }

    await tx
      .update(followUps)
      .set({
        failedVerifyAttempts: 0,
        verifyLockedUntil: null,
        consentedAt: sql`coalesce(${followUps.consentedAt}, now())`,
      })
      .where(eq(followUps.id, row.id));

    // Tidy this follow-up's expired sessions while we are here.
    await tx
      .delete(patientSessions)
      .where(
        and(eq(patientSessions.followUpId, row.id), lt(patientSessions.expiresAt, sql`now()`)),
      );

    const sessionToken = generateToken();
    await tx.insert(patientSessions).values({
      followUpId: row.id,
      tokenHash: hashToken(sessionToken),
      expiresAt: sql`now() + make_interval(days => ${PATIENT_SESSION_DAYS})`,
    });

    return {ok: true, followUpId: row.id, sessionToken} as const;
  });
}

/**
 * The follow-up a patient session may see, or undefined. The session must
 * be unexpired AND belong to the follow-up the link token points at, so a
 * session for one follow-up opens no other.
 */
export async function findSessionFollowUp(
  db: Db,
  token: unknown,
  sessionToken: unknown,
): Promise<string | undefined> {
  if (typeof token !== 'string' || !token) return undefined;
  if (typeof sessionToken !== 'string' || !sessionToken) return undefined;

  const [row] = await db
    .select({followUpId: patientSessions.followUpId})
    .from(patientSessions)
    .innerJoin(followUps, eq(followUps.id, patientSessions.followUpId))
    .where(
      and(
        eq(patientSessions.tokenHash, hashToken(sessionToken)),
        sql`${patientSessions.expiresAt} > now()`,
        eq(followUps.linkTokenHash, hashToken(token)),
      ),
    );
  return row?.followUpId;
}

export type PatientWriteCheck =
  | {ok: true; followUpId: string}
  | {ok: false; reason: 'no_session' | 'closed'};

/**
 * Whether a patient may add anything to a follow-up right now: they need a
 * session for the follow-up the link points at, and its window must be open
 * on the database clock. Every patient write starts here. A write that
 * stores something must also repeat `isOpen` in its own statement.
 */
export async function checkPatientCanWrite(
  db: Db,
  token: unknown,
  sessionToken: unknown,
): Promise<PatientWriteCheck> {
  const followUpId = await findSessionFollowUp(db, token, sessionToken);
  if (!followUpId) return {ok: false, reason: 'no_session'};

  const [row] = await db
    .select({isOpen})
    .from(followUps)
    .where(eq(followUps.id, followUpId));
  return row?.isOpen ? {ok: true, followUpId} : {ok: false, reason: 'closed'};
}

export type ExtendResult =
  | {ok: true}
  | {ok: false; reason: 'still_open' | 'closed_by_clinic' | 'payment_failed' | 'not_found'};

/**
 * Reopens a follow-up that ran out of time, for 7 days from now. One that
 * staff closed early cannot be extended. The charge happens only after the
 * follow-up is known to be eligible, and the row stays locked meanwhile so
 * a double tap pays once. Once reopened, the patient is unmuted in the chat.
 */
export async function extendWindow(
  db: Db,
  followUpId: string,
  charge: () => Promise<PaymentResult>,
  nexconn: NexconnServer,
): Promise<ExtendResult> {
  const result = await db.transaction(async tx => {
    const [row] = await tx
      .select({
        isClosedEarly: sql<boolean>`${followUps.closedEarlyAt} is not null`,
        hasEnded: sql<boolean>`now() >= ${followUps.endsAt}`,
      })
      .from(followUps)
      .where(eq(followUps.id, followUpId))
      .for('update');

    if (!row) return {ok: false, reason: 'not_found'} as const;
    if (row.isClosedEarly) return {ok: false, reason: 'closed_by_clinic'} as const;
    if (!row.hasEnded) return {ok: false, reason: 'still_open'} as const;

    const payment = await charge();
    if (!payment.ok) return {ok: false, reason: 'payment_failed'} as const;

    await tx
      .update(followUps)
      .set({endsAt: sql`now() + make_interval(days => ${EXTENSION_DAYS})`})
      .where(eq(followUps.id, followUpId));
    return {ok: true} as const;
  });

  // After the transaction, so the unmute sees the new window.
  if (result.ok) await syncPatientGateQuietly(db, nexconn, followUpId);
  return result;
}
