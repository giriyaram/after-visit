// Issues Nexconn connection tokens, each only after the app's own access
// check: a staff member for a follow-up in their clinic, a patient for the
// follow-up their session and link point at. The browser gets the token and
// nothing else; the App Secret stays in NexconnServer.
import {eq, sql} from 'drizzle-orm';
import type {CurrentStaff} from '../current-staff';
import {followUps} from '../db/schema';
import {isUuid} from '../follow-ups/input';
import {findSessionFollowUp, inClinic, type Db} from '../follow-ups/lifecycle';
import {syncPatientGate} from './channel';
import {patientChatId, staffChatId} from './ids';
import type {NexconnServer} from './nexconn-server';

export type ChatSession = {
  /** Nexconn connection token. Hand it to the SDK; never store or log it. */
  token: string;
  userId: string;
  channelId: string;
  /** Whether the patient may send right now, on the database clock. */
  isOpen: boolean;
  endsAt: string;
};

export type StaffChatSessionResult =
  | {ok: true; session: ChatSession}
  | {ok: false; reason: 'not_found'};

/** A staff member's token for one of their clinic's follow-ups, any state. */
export async function issueStaffChatSession(
  db: Db,
  nexconn: NexconnServer,
  staff: CurrentStaff,
  followUpId: unknown,
): Promise<StaffChatSessionResult> {
  if (!isUuid(followUpId)) return {ok: false, reason: 'not_found'};
  const [row] = await db
    .select({id: followUps.id, endsAt: followUps.endsAt})
    .from(followUps)
    .where(inClinic(staff, followUpId));
  if (!row) return {ok: false, reason: 'not_found'};

  const gate = await syncPatientGate(db, nexconn, row.id);
  if (!gate) return {ok: false, reason: 'not_found'};

  // Staff created after the channel was are not in it yet. Joining an
  // existing member is a no-op, so this is safe to repeat.
  const userId = staffChatId(staff.id);
  await nexconn.joinGroup(gate.channelId, [userId]);

  const token = await nexconn.issueToken(userId, staff.name);
  return {
    ok: true,
    session: {token, userId, channelId: gate.channelId, isOpen: gate.isOpen, endsAt: row.endsAt.toISOString()},
  };
}

/** Where the window stands, on the database clock, for the open screens. */
export type ChatState = {
  isOpen: boolean;
  isClosedEarly: boolean;
  endsAt: string;
  /** The database's now, so the browser can time the end without trusting its own clock. */
  serverNow: string;
};

async function readState(db: Db, followUpId: string): Promise<ChatState | undefined> {
  const [row] = await db
    .select({
      endsAt: followUps.endsAt,
      isClosedEarly: sql<boolean>`${followUps.closedEarlyAt} is not null`,
      serverNow: sql<Date>`now()`,
    })
    .from(followUps)
    .where(eq(followUps.id, followUpId));
  if (!row) return undefined;
  return {
    isOpen: false, // filled in by the gate below
    isClosedEarly: row.isClosedEarly,
    endsAt: row.endsAt.toISOString(),
    serverNow: new Date(row.serverNow).toISOString(),
  };
}

/**
 * The patient's view of the window right now. Runs the gate, so asking is
 * also what mutes the patient once the window has ended.
 */
export async function getPatientChatState(
  db: Db,
  nexconn: NexconnServer,
  linkToken: unknown,
  sessionToken: unknown,
): Promise<ChatState | undefined> {
  const followUpId = await findSessionFollowUp(db, linkToken, sessionToken);
  if (!followUpId) return undefined;
  const gate = await syncPatientGate(db, nexconn, followUpId);
  const state = await readState(db, followUpId);
  if (!gate || !state) return undefined;
  return {...state, isOpen: gate.isOpen};
}

/** The same for staff, for a follow-up in their clinic. */
export async function getStaffChatState(
  db: Db,
  nexconn: NexconnServer,
  staff: CurrentStaff,
  followUpId: unknown,
): Promise<ChatState | undefined> {
  if (!isUuid(followUpId)) return undefined;
  const [row] = await db.select({id: followUps.id}).from(followUps).where(inClinic(staff, followUpId));
  if (!row) return undefined;
  const gate = await syncPatientGate(db, nexconn, row.id);
  const state = await readState(db, row.id);
  if (!gate || !state) return undefined;
  return {...state, isOpen: gate.isOpen};
}

export type InboxChatSession = {token: string; userId: string};

/**
 * A staff member's token with no follow-up in mind: the inbox uses it to
 * read unread counts across their clinic's channels. The channels they can
 * see are the ones they were added to as a member, which the server does
 * per clinic (lib/chat/channel.ts).
 */
export async function issueStaffInboxSession(
  nexconn: NexconnServer,
  staff: CurrentStaff,
): Promise<InboxChatSession> {
  const userId = staffChatId(staff.id);
  const token = await nexconn.issueToken(userId, staff.name);
  return {token, userId};
}

export type PatientChatSessionResult =
  | {ok: true; session: ChatSession}
  | {ok: false; reason: 'no_session'};

/**
 * The patient's token for the follow-up their session and link agree on.
 * Issued in any state, since a closed follow-up stays readable; sending is
 * stopped by the mute that syncPatientGate applies.
 */
export async function issuePatientChatSession(
  db: Db,
  nexconn: NexconnServer,
  linkToken: unknown,
  sessionToken: unknown,
): Promise<PatientChatSessionResult> {
  const followUpId = await findSessionFollowUp(db, linkToken, sessionToken);
  if (!followUpId) return {ok: false, reason: 'no_session'};

  const gate = await syncPatientGate(db, nexconn, followUpId);
  if (!gate) return {ok: false, reason: 'no_session'};
  const [row] = await db
    .select({endsAt: followUps.endsAt})
    .from(followUps)
    .where(eq(followUps.id, followUpId));

  const userId = patientChatId(followUpId);
  // A patient talks only in their follow-up's channel. Without this, their
  // token could open a direct channel to any staff id they have seen and
  // send there at any time, mute or no mute. Before the token, so a failure
  // means no token.
  await nexconn.muteInDirectChannels(userId);
  // The name only labels push notifications, so it carries no patient data.
  const token = await nexconn.issueToken(userId, 'Patient');
  return {
    ok: true,
    session: {token, userId, channelId: gate.channelId, isOpen: gate.isOpen, endsAt: row.endsAt.toISOString()},
  };
}
