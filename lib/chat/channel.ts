// The Nexconn side of a follow-up: one group channel, created when the
// follow-up is opened, and a patient who is muted whenever the follow-up is
// not open. The database is the truth; these functions make Nexconn agree
// with it and may be called any number of times.
import {and, eq, isNotNull, isNull, not, sql} from 'drizzle-orm';
import {isOpen} from '../db/follow-up-state';
import {followUps, staff} from '../db/schema';
import type {Db} from '../follow-ups/lifecycle';
import {channelIdFor, patientChatId, staffChatId} from './ids';
import type {NexconnServer} from './nexconn-server';

/** Group name shown by Nexconn tooling. Carries no patient data. */
const CHANNEL_NAME = 'Follow-up';

/**
 * Makes sure the follow-up's group channel exists, with the patient and
 * every current staff member of the clinic in it. Returns the channel id,
 * or undefined when there is no such follow-up.
 */
export async function ensureChannel(
  db: Db,
  nexconn: NexconnServer,
  followUpId: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({
      clinicId: followUps.clinicId,
      doctorId: followUps.doctorId,
      createdAt: followUps.chatChannelCreatedAt,
    })
    .from(followUps)
    .where(eq(followUps.id, followUpId));
  if (!row) return undefined;

  const channelId = channelIdFor(followUpId);
  if (row.createdAt) return channelId;

  // Claim the creation first so two requests do not both create. Nexconn
  // also tolerates a repeat create, so losing the claim is harmless.
  const [claimed] = await db
    .update(followUps)
    .set({chatChannelCreatedAt: sql`now()`})
    .where(and(eq(followUps.id, followUpId), isNull(followUps.chatChannelCreatedAt)))
    .returning({id: followUps.id});
  if (!claimed) return channelId;

  try {
    const members = await db
      .select({id: staff.id})
      .from(staff)
      .where(eq(staff.clinicId, row.clinicId));
    const owner = staffChatId(row.doctorId);
    const userIds = [
      patientChatId(followUpId),
      ...members.map(m => staffChatId(m.id)).filter(id => id !== owner),
    ];
    await nexconn.createGroup({channelId, name: CHANNEL_NAME, owner, userIds});
  } catch (error) {
    // Give the claim back so the next caller tries again.
    await db
      .update(followUps)
      .set({chatChannelCreatedAt: null})
      .where(eq(followUps.id, followUpId));
    throw error;
  }
  return channelId;
}

export type GateState = {channelId: string; isOpen: boolean};

/**
 * Mutes the patient in the channel when the follow-up is not open on the
 * database clock, and unmutes them when it is. Call it after anything that
 * changes the window and whenever a chat page loads; the window also ends
 * by itself, with no event behind it.
 */
export async function syncPatientGate(
  db: Db,
  nexconn: NexconnServer,
  followUpId: string,
): Promise<GateState | undefined> {
  const channelId = await ensureChannel(db, nexconn, followUpId);
  if (!channelId) return undefined;

  const [row] = await db
    .select({isOpen, mutedAt: followUps.chatPatientMutedAt})
    .from(followUps)
    .where(eq(followUps.id, followUpId));
  if (!row) return undefined;

  const patient = patientChatId(followUpId);
  if (!row.isOpen && !row.mutedAt) {
    await nexconn.muteMember(channelId, patient);
    await db
      .update(followUps)
      .set({chatPatientMutedAt: sql`now()`})
      .where(eq(followUps.id, followUpId));
  } else if (row.isOpen && row.mutedAt) {
    await nexconn.unmuteMember(channelId, patient);
    await db
      .update(followUps)
      .set({chatPatientMutedAt: null})
      .where(eq(followUps.id, followUpId));
  }
  return {channelId, isOpen: row.isOpen};
}

/**
 * A few seconds past now, so a token Nexconn issued a moment ago counts as
 * old even if its clock runs a little ahead of ours. Nobody can get a new
 * patient token that soon: the old link's sessions are already gone.
 */
const TOKEN_CLOCK_MARGIN_MS = 5_000;

/**
 * Cuts off every chat client the patient has: tokens issued until now stop
 * working, and live connections are dropped so they cannot reconnect with
 * them. The patient gets a fresh token through the new link. Call it only
 * after the old link's sessions are deleted.
 */
export async function revokePatientChat(nexconn: NexconnServer, followUpId: string) {
  const patient = patientChatId(followUpId);
  await nexconn.expireTokens(patient, Date.now() + TOKEN_CLOCK_MARGIN_MS);
  await nexconn.disconnectUser(patient);
}

/**
 * Mutes the patient in every follow-up that has ended but whose patient is
 * not muted yet. Only follow-ups with a channel: without one, nobody has
 * connected to it. This is what closes the chat at `ends_at` when no screen
 * is open to ask (lib/chat/sweeper.ts runs it). One failure does not stop
 * the rest; the next run retries it.
 */
export async function muteEndedWindows(db: Db, nexconn: NexconnServer) {
  const due = await db
    .select({id: followUps.id})
    .from(followUps)
    .where(
      and(
        not(isOpen),
        isNull(followUps.chatPatientMutedAt),
        isNotNull(followUps.chatChannelCreatedAt),
      ),
    );
  let failed = 0;
  for (const {id} of due) {
    try {
      await syncPatientGate(db, nexconn, id);
    } catch (error) {
      failed++;
      console.error(`Chat mute for ended follow-up ${id} failed; the next sweep retries it.`, error);
    }
  }
  return {muted: due.length - failed, failed};
}

/**
 * Milliseconds until the next open follow-up ends, on the database clock,
 * or undefined when none is open.
 */
export async function msUntilNextWindowEnd(db: Db): Promise<number | undefined> {
  const [row] = await db
    .select({ms: sql<string | null>`extract(epoch from min(${followUps.endsAt}) - now()) * 1000`})
    .from(followUps)
    .where(isOpen);
  return row?.ms == null ? undefined : Math.max(Number(row.ms), 0);
}

/**
 * Runs the gate but never throws: the database write that called it has
 * already happened, and the next chat page load runs the gate again.
 */
export async function syncPatientGateQuietly(
  db: Db,
  nexconn: NexconnServer,
  followUpId: string,
) {
  try {
    await syncPatientGate(db, nexconn, followUpId);
  } catch (error) {
    console.error('Chat gate sync failed; it will retry on the next chat load.', error);
  }
}
