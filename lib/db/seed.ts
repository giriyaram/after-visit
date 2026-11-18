// Resets the database to one sample clinic. Every name, phone number and
// note here is made up. Run with `npm run db:seed`.
import {hashPassword} from 'better-auth/crypto';
import {sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import {hashToken} from '../link-token';
import {isOpen} from './follow-up-state';
import {clinics, followUps, staff, staffAccounts} from './schema';

const CLINIC_ID = '00000000-0000-4000-8000-000000000001';
const RECEPTIONIST_ID = '00000000-0000-4000-8000-000000000002';
const DOCTOR_ID = '00000000-0000-4000-8000-000000000003';
const DEMO_ID = '00000000-0000-4000-8000-000000000004';

/**
 * A public demo login, printed in the README so anyone can try the staff
 * side. The password is deliberately not a secret, which is safe only
 * because the seed never runs in production (see main) and the data is made up.
 */
const DEMO_STAFF = {
  id: DEMO_ID,
  role: 'reception' as const,
  name: 'Demo Staff',
  email: 'demo@aftervisit.example',
  password: 'AfterVisit-Demo-2026',
};

const SEED_STAFF = [
  {
    id: RECEPTIONIST_ID,
    role: 'reception' as const,
    name: 'Asha Nair',
    email: 'asha.nair@sample-clinic.example',
  },
  {
    id: DOCTOR_ID,
    role: 'doctor' as const,
    name: 'Dr. Meera Iyer',
    email: 'meera.iyer@sample-clinic.example',
  },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type SeedFollowUp = {
  patientName: string;
  patientPhone: string;
  windowDays: 3 | 7 | 14;
  visitNote: string;
  /** How long before the seed runs the follow-up started. */
  startedAgo: number;
  closedEarlyAgo?: number;
  hasConsented: boolean;
  isFlagged: boolean;
};

const SEED_FOLLOW_UPS: SeedFollowUp[] = [
  {
    patientName: 'Sample Patient One',
    patientPhone: '+910000001234',
    windowDays: 7,
    visitNote: 'Sprained left ankle. Rest, ice, and review if swelling persists.',
    startedAgo: 2 * DAY,
    hasConsented: true,
    isFlagged: true,
  },
  {
    patientName: 'Sample Patient Two',
    patientPhone: '+910000002345',
    windowDays: 3,
    visitNote: 'Routine check-up. Blood test results due this week.',
    startedAgo: 2 * DAY,
    closedEarlyAgo: 1 * DAY,
    hasConsented: true,
    isFlagged: false,
  },
  {
    patientName: 'Sample Patient Three',
    patientPhone: '+910000003456',
    windowDays: 14,
    visitNote: 'Dressing changed on right forearm. Keep dry for 48 hours.',
    startedAgo: 2 * DAY,
    hasConsented: true,
    isFlagged: false,
  },
  {
    patientName: 'Sample Patient Four',
    patientPhone: '+910000004567',
    windowDays: 7,
    visitNote: 'Follow-up after fever. Fluids and rest advised.',
    startedAgo: 6 * DAY + 20 * HOUR,
    hasConsented: true,
    isFlagged: true,
  },
  {
    patientName: 'Sample Patient Five',
    patientPhone: '+910000005678',
    windowDays: 3,
    visitNote: 'Seasonal allergy review. New antihistamine started.',
    startedAgo: 1 * HOUR,
    hasConsented: false,
    isFlagged: false,
  },
  {
    patientName: 'Sample Patient Six',
    patientPhone: '+910000006789',
    windowDays: 7,
    visitNote: 'Recovery check after viral infection.',
    startedAgo: 9 * DAY,
    hasConsented: true,
    isFlagged: false,
  },
];

/** Fixed ids of the six seeded follow-ups, in seed order. */
const SEED_FOLLOW_UP_IDS = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106',
] as const;

/** Weak, fixed tokens so the sample links stay the same. Seed only. */
const seedToken = (index: number) => `seed-token-${index + 1}`;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The seed deletes all data and must not run in production.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }

  // Both sample staff sign in with this password. It lives in .env.local,
  // not in the code.
  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (!staffPassword || staffPassword.length < 12) {
    throw new Error('SEED_STAFF_PASSWORD must be set to at least 12 characters.');
  }
  const passwordHash = await hashPassword(staffPassword);

  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const db = drizzle(pool);
  const now = Date.now();

  await db.transaction(async tx => {
    await tx.execute(
      sql`truncate table patient_sessions, follow_ups, staff_sessions, staff_accounts, verifications, rate_limits, staff, clinics`,
    );

    await tx.insert(clinics).values({
      id: CLINIC_ID,
      name: 'Sample Clinic',
      phone: '000 000 0000',
      timezone: 'Asia/Kolkata',
    });

    await tx
      .insert(staff)
      .values(SEED_STAFF.map(member => ({...member, clinicId: CLINIC_ID})));
    await tx.insert(staffAccounts).values(
      SEED_STAFF.map(member => ({
        userId: member.id,
        providerId: 'credential',
        accountId: member.id,
        password: passwordHash,
      })),
    );

    const {password: demoPassword, ...demo} = DEMO_STAFF;
    await tx.insert(staff).values({...demo, clinicId: CLINIC_ID});
    await tx.insert(staffAccounts).values({
      userId: demo.id,
      providerId: 'credential',
      accountId: demo.id,
      password: await hashPassword(demoPassword),
    });

    await tx.insert(followUps).values(
      SEED_FOLLOW_UPS.map((followUp, index) => {
        const startsAt = new Date(now - followUp.startedAgo);
        return {
          id: SEED_FOLLOW_UP_IDS[index],
          clinicId: CLINIC_ID,
          doctorId: DOCTOR_ID,
          patientName: followUp.patientName,
          patientPhone: followUp.patientPhone,
          windowDays: followUp.windowDays,
          visitNote: followUp.visitNote,
          startsAt,
          endsAt: new Date(startsAt.getTime() + followUp.windowDays * DAY),
          closedEarlyAt: followUp.closedEarlyAgo
            ? new Date(now - followUp.closedEarlyAgo)
            : null,
          linkTokenHash: hashToken(seedToken(index)),
          consentedAt: followUp.hasConsented ? startsAt : null,
          flaggedForDoctorAt: followUp.isFlagged ? new Date(now - HOUR) : null,
          createdAt: startsAt,
        };
      }),
    );
  });

  const [counts] = await db
    .select({
      clinics: sql<number>`(select count(*)::int from ${clinics})`,
      staff: sql<number>`(select count(*)::int from ${staff})`,
      followUps: sql<number>`count(*)::int`,
      open: sql<number>`(count(*) filter (where ${isOpen}))::int`,
    })
    .from(followUps);

  console.log(
    `Seeded ${counts.clinics} clinic, ${counts.staff} staff, ${counts.followUps} follow-ups ` +
      `(${counts.open} open, ${counts.followUps - counts.open} closed).`,
  );
  console.log('\nStaff sign-in (password is SEED_STAFF_PASSWORD):');
  SEED_STAFF.forEach(member => {
    console.log(`  ${member.email}  ${member.role}`);
  });
  console.log(`\nDemo sign-in (public, from the README):\n  ${DEMO_STAFF.email}  ${DEMO_STAFF.password}`);
  console.log('\nPatient links (last 4 digits of the phone):');
  SEED_FOLLOW_UPS.forEach((followUp, index) => {
    console.log(
      `  /visit/${seedToken(index)}  ${followUp.patientName}  (${followUp.patientPhone.slice(-4)})`,
    );
  });

  await pool.end();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
