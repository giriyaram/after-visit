// Validation for opening a follow-up. Pure, so the server action and (later)
// the form can share it. The server always runs it; the form's copy is only
// for faster feedback.

export const WINDOW_LENGTHS = [3, 7, 14] as const;
export type WindowDays = (typeof WINDOW_LENGTHS)[number];

export const NAME_MAX_LENGTH = 80;
export const NOTE_MAX_LENGTH = 120;

const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** The only short window: a 2-minute follow-up for trying the end of the window. */
export const DEV_WINDOW_MINUTES = 2;
/** The radio value that asks for it. Never stored. */
export const DEV_WINDOW_VALUE = 'dev-2-minutes';

export type FollowUpInput = {
  patientName: string;
  /** Digits with an optional leading +. */
  patientPhone: string;
  windowDays: WindowDays;
  /** Set only for the dev short window: the window ends this many minutes after opening. */
  windowMinutes?: number;
  visitNote: string;
  doctorId: string;
};

export type FollowUpInputErrors = Partial<Record<keyof FollowUpInput, string>>;

/**
 * Strips spaces, dashes and brackets. Returns undefined unless what is left
 * is 7 to 15 digits with an optional leading +.
 */
export function normalisePhone(phone: string): string | undefined {
  const compact = phone.trim().replace(/[\s()-]/g, '');
  return /^\+?\d{7,15}$/.test(compact) ? compact : undefined;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Checks untrusted input and returns clean values or one message per field. */
export function validateFollowUpInput(
  input: unknown,
  options: {
    /** Accepts the 2-minute dev window. Only ever true outside production. */
    allowDevWindow?: boolean;
  } = {},
): {ok: true; values: FollowUpInput} | {ok: false; errors: FollowUpInputErrors} {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const errors: FollowUpInputErrors = {};

  const patientName = text(raw.patientName);
  if (!patientName) {
    errors.patientName = 'Enter the patient’s name.';
  } else if (patientName.length > NAME_MAX_LENGTH) {
    errors.patientName = `Keep the name to ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  const patientPhone = normalisePhone(text(raw.patientPhone));
  if (!text(raw.patientPhone)) {
    errors.patientPhone = 'Enter the patient’s phone number.';
  } else if (!patientPhone) {
    errors.patientPhone = 'Enter a phone number with 7 to 15 digits.';
  }

  const isDevWindow = raw.windowDays === DEV_WINDOW_VALUE;
  // The dev window is stored as the shortest real length, ending in minutes.
  const windowDays = isDevWindow
    ? WINDOW_LENGTHS[0]
    : WINDOW_LENGTHS.find(days => days === raw.windowDays);
  if (!windowDays || (isDevWindow && !options.allowDevWindow)) {
    errors.windowDays = 'Choose how long the follow-up stays open.';
  }

  const visitNote = text(raw.visitNote);
  if (!visitNote) {
    errors.visitNote = 'Add a one-line note about the visit.';
  } else if (/[\r\n]/.test(visitNote)) {
    errors.visitNote = 'Keep the note to one line.';
  } else if (visitNote.length > NOTE_MAX_LENGTH) {
    errors.visitNote = `Keep the note to ${NOTE_MAX_LENGTH} characters or fewer.`;
  }

  if (!isUuid(raw.doctorId)) {
    errors.doctorId = 'Choose the assigned doctor.';
  }

  if (Object.keys(errors).length > 0 || !patientPhone || !windowDays) {
    return {ok: false, errors};
  }
  return {
    ok: true,
    values: {
      patientName,
      patientPhone,
      windowDays,
      ...(isDevWindow ? {windowMinutes: DEV_WINDOW_MINUTES} : {}),
      visitNote,
      doctorId: raw.doctorId as string,
    },
  };
}
