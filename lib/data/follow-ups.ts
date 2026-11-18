import 'server-only';
import {and, asc, eq, sql} from 'drizzle-orm';
import {patientChatId, staffChatId} from '../chat/ids';
import {getCurrentStaff} from '../current-staff';
import {db} from '../db/client';
import {daysRemaining, isOpen} from '../db/follow-up-state';
import {clinics, followUps, staff} from '../db/schema';
import type {ClinicView, FollowUpView, PatientFollowUpView} from '../follow-up-view';
import {isUuid} from '../follow-ups/input';
import {hashToken} from '../link-token';
import {getPatientSessionFollowUp} from '../patient-session';

const followUpColumns = {
  id: followUps.id,
  patientName: followUps.patientName,
  visitNote: followUps.visitNote,
  doctor: staff.name,
  isOpen,
  isClosedEarly: sql<boolean>`${followUps.closedEarlyAt} is not null`,
  daysRemaining,
  endsAt: sql<string>`to_char(${followUps.endsAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
  isFlaggedForDoctor: sql<boolean>`${followUps.flaggedForDoctorAt} is not null`,
};

// The two staff functions below read the clinic from the signed-in staff
// member themselves. A caller cannot ask for another clinic.

/**
 * The signed-in staff member's clinic's open follow-ups for the inbox, the
 * ones ending soonest first. Unread counts come from Nexconn in the
 * browser, which moves unread rows to the top (app/(staff)/inbox).
 */
export async function listOpenFollowUps(options: {flaggedOnly?: boolean} = {}): Promise<FollowUpView[]> {
  const {clinicId} = await getCurrentStaff();
  return db
    .select(followUpColumns)
    .from(followUps)
    .innerJoin(staff, eq(staff.id, followUps.doctorId))
    .where(
      and(
        eq(followUps.clinicId, clinicId),
        isOpen,
        options.flaggedOnly ? sql`${followUps.flaggedForDoctorAt} is not null` : undefined,
      ),
    )
    .orderBy(asc(followUps.endsAt));
}

/**
 * One follow-up, open or closed, only if it belongs to the signed-in staff
 * member's clinic.
 */
export async function getFollowUp(
  followUpId: string,
): Promise<FollowUpView | undefined> {
  const {clinicId} = await getCurrentStaff();
  if (!isUuid(followUpId)) return undefined;

  const [row] = await db
    .select(followUpColumns)
    .from(followUps)
    .innerJoin(staff, eq(staff.id, followUps.doctorId))
    .where(and(eq(followUps.clinicId, clinicId), eq(followUps.id, followUpId)));

  return row;
}

export type StaffConversation = {
  followUp: FollowUpView;
  /** Display names by chat user id: the patient and every staff member. */
  names: Record<string, string>;
};

/** A follow-up with the names its chat needs. Same scoping as getFollowUp. */
export async function getStaffConversation(
  followUpId: string,
): Promise<StaffConversation | undefined> {
  const followUp = await getFollowUp(followUpId);
  if (!followUp) return undefined;
  const {clinicId} = await getCurrentStaff();
  const members = await db
    .select({id: staff.id, name: staff.name})
    .from(staff)
    .where(eq(staff.clinicId, clinicId));
  return {
    followUp,
    names: {
      [patientChatId(followUp.id)]: followUp.patientName,
      ...Object.fromEntries(members.map(m => [staffChatId(m.id), m.name])),
    },
  };
}

/** The clinic's doctors, for the assigned-doctor picker. */
export async function listDoctors(): Promise<{id: string; name: string}[]> {
  const {clinicId} = await getCurrentStaff();
  return db
    .select({id: staff.id, name: staff.name})
    .from(staff)
    .where(and(eq(staff.clinicId, clinicId), eq(staff.role, 'doctor')))
    .orderBy(asc(staff.name));
}

/** The signed-in staff member's own clinic. */
export async function getStaffClinic(): Promise<ClinicView> {
  const {clinicId} = await getCurrentStaff();
  const [clinic] = await db
    .select({name: clinics.name, phone: clinics.phone})
    .from(clinics)
    .where(eq(clinics.id, clinicId));
  return clinic;
}

// The patient functions below are scoped by the link token, not by clinic:
// a token points at exactly one follow-up.

/**
 * The clinic a patient link belongs to. This is all that a link shows before
 * the phone digits are confirmed, so it returns nothing about the patient.
 */
export async function getLinkClinic(token: string): Promise<ClinicView | undefined> {
  const [row] = await db
    .select({name: clinics.name, phone: clinics.phone})
    .from(followUps)
    .innerJoin(clinics, eq(clinics.id, followUps.clinicId))
    .where(eq(followUps.linkTokenHash, hashToken(token)));
  return row;
}

export type PatientVisit = {
  clinic: ClinicView;
  followUp: PatientFollowUpView;
  /** Staff display names by chat user id, so the thread can label their messages. */
  staffNames: Record<string, string>;
};

/**
 * The follow-up a patient link points at, with its clinic. Returns nothing
 * unless this browser holds a patient session for that follow-up.
 */
export async function getPatientVisit(token: string): Promise<PatientVisit | undefined> {
  const followUpId = await getPatientSessionFollowUp(token);
  if (!followUpId) return undefined;

  // Only the columns the patient screen shows leave the server.
  const [row] = await db
    .select({
      id: followUpColumns.id,
      visitNote: followUpColumns.visitNote,
      isOpen: followUpColumns.isOpen,
      isClosedEarly: followUpColumns.isClosedEarly,
      endsAt: followUpColumns.endsAt,
      clinicName: clinics.name,
      clinicPhone: clinics.phone,
    })
    .from(followUps)
    .innerJoin(clinics, eq(clinics.id, followUps.clinicId))
    .where(
      and(eq(followUps.id, followUpId), eq(followUps.linkTokenHash, hashToken(token))),
    );

  if (!row) return undefined;
  const {clinicName, clinicPhone, ...followUp} = row;

  const [{clinicId}] = await db
    .select({clinicId: followUps.clinicId})
    .from(followUps)
    .where(eq(followUps.id, followUpId));
  const members = await db
    .select({id: staff.id, name: staff.name})
    .from(staff)
    .where(eq(staff.clinicId, clinicId));

  return {
    clinic: {name: clinicName, phone: clinicPhone},
    followUp,
    staffNames: Object.fromEntries(members.map(m => [staffChatId(m.id), m.name])),
  };
}
