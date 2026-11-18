// The shapes the screens receive. Everything here comes from the database;
// messages and unread counts live in Nexconn and reach the browser through
// the Chat SDK (lib/chat/client.ts).

export type FollowUpView = {
  id: string;
  patientName: string;
  visitNote: string;
  doctor: string;
  /** Derived on the database clock; never stored. */
  isOpen: boolean;
  isClosedEarly: boolean;
  daysRemaining: number;
  /** ISO time the window ends, for ordering by time remaining. */
  endsAt: string;
  isFlaggedForDoctor: boolean;
};

/**
 * What a patient's browser receives about their follow-up: only what the
 * screen shows. No name, phone, doctor or staff flags.
 */
export type PatientFollowUpView = Pick<
  FollowUpView,
  'id' | 'visitNote' | 'isOpen' | 'isClosedEarly' | 'endsAt'
>;

export type ClinicView = {
  name: string;
  phone: string;
};

export function daysRemainingLabel(days: number) {
  return days === 1 ? '1 day left' : `${days} days left`;
}
