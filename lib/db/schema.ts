import {sql} from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, {withTimezone: true});

export const staffRole = pgEnum('staff_role', ['doctor', 'reception']);

// Staff sign-in is Better Auth (lib/auth.ts). Its "user" is the staff table,
// and staff_sessions, staff_accounts, verifications and rate_limits are its
// tables. On those, the property names are Better Auth's field names, so
// `userId` is the staff_id column.

// One seeded row. There are no screens to manage clinics.
export const clinics = pgTable('clinics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id),
    role: staffRole('role').notNull(),
    name: text('name').notNull(),
    /** Sign-in email, stored lower-case. */
    email: text('email').notNull().unique(),
    // Better Auth requires the next two columns. Nothing reads them.
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  table => [
    // Lets follow_ups point at (clinic_id, id), so a follow-up's doctor is
    // always from the same clinic.
    unique('staff_clinic_id_id_unique').on(table.clinicId, table.id),
    index('staff_clinic_id_role_index').on(table.clinicId, table.role),
  ],
);

// There is no status column. Open or closed is derived from starts_at,
// ends_at and closed_early_at; see lib/db/follow-up-state.ts.
export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id),
    doctorId: uuid('doctor_id').notNull(),
    patientName: text('patient_name').notNull(),
    patientPhone: text('patient_phone').notNull(),
    windowDays: smallint('window_days').notNull(),
    visitNote: text('visit_note').notNull(),
    startsAt: timestamptz('starts_at').notNull().defaultNow(),
    endsAt: timestamptz('ends_at').notNull(),
    closedEarlyAt: timestamptz('closed_early_at'),
    /** SHA-256 hex of the patient link token. The raw token is never stored. */
    linkTokenHash: text('link_token_hash').notNull(),
    consentedAt: timestamptz('consented_at'),
    failedVerifyAttempts: smallint('failed_verify_attempts').notNull().default(0),
    verifyLockedUntil: timestamptz('verify_locked_until'),
    flaggedForDoctorAt: timestamptz('flagged_for_doctor_at'),
    /** When the Nexconn group channel for this follow-up was created. Null until it exists. */
    chatChannelCreatedAt: timestamptz('chat_channel_created_at'),
    /** When the patient was last muted in that channel. Null while they may send. */
    chatPatientMutedAt: timestamptz('chat_patient_muted_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  table => [
    foreignKey({
      name: 'follow_ups_clinic_id_doctor_id_staff_fk',
      columns: [table.clinicId, table.doctorId],
      foreignColumns: [staff.clinicId, staff.id],
    }),
    unique('follow_ups_link_token_hash_unique').on(table.linkTokenHash),
    index('follow_ups_clinic_id_ends_at_index').on(table.clinicId, table.endsAt),
    check('follow_ups_window_days_check', sql`${table.windowDays} in (3, 7, 14)`),
    check(
      'follow_ups_visit_note_check',
      sql`char_length(${table.visitNote}) between 1 and 120`,
    ),
    check('follow_ups_ends_at_check', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

// Records that a browser passed the last-4-digits check for one follow-up.
export const patientSessions = pgTable('patient_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  followUpId: uuid('follow_up_id')
    .notNull()
    .references(() => followUps.id, {onDelete: 'cascade'}),
  /** SHA-256 hex of the session cookie value. */
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at').notNull(),
});

// A signed-in browser. Better Auth stores the token as plain text; this is
// the one accepted exception to the hash-only rule for tokens.
export const staffSessions = pgTable(
  'staff_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, {onDelete: 'cascade'}),
    token: text('token').notNull().unique(),
    expiresAt: timestamptz('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  table => [index('staff_sessions_staff_id_index').on(table.userId)],
);

// Holds each staff member's password hash. The token and scope columns are
// required by Better Auth and stay empty, because there is no social login.
export const staffAccounts = pgTable(
  'staff_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, {onDelete: 'cascade'}),
    /** Always `credential`. */
    providerId: text('provider_id').notNull(),
    /** The staff id, as text. */
    accountId: text('account_id').notNull(),
    /** scrypt hash, never the password itself. */
    password: text('password'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    scope: text('scope'),
    accessTokenExpiresAt: timestamptz('access_token_expires_at'),
    refreshTokenExpiresAt: timestamptz('refresh_token_expires_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  table => [index('staff_accounts_staff_id_index').on(table.userId)],
);

// Required by Better Auth. It stays empty: there is no email verification
// and no password reset.
export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamptz('expires_at').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

// Sign-in attempt counts, kept here so the limit holds across server
// instances.
export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  /** Milliseconds since 1970, as Better Auth writes it. */
  lastRequest: bigint('last_request', {mode: 'number'}).notNull(),
});
