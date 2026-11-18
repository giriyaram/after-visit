// Shared setup for tests that run against the real database. Each test
// works inside a transaction that is rolled back, so nothing it writes is
// kept. Not a test file itself (no .test.ts), so the runner skips it.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {eq, sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import {FakeNexconnServer} from '../chat/fake-server';
import type {CurrentStaff} from '../current-staff';
import {clinics, followUps, staff} from '../db/schema';
import {createFollowUp, type Db} from './lifecycle';

export type World = {
  db: Db;
  nexconn: FakeNexconnServer;
  reception: CurrentStaff;
  doctor: CurrentStaff;
  /** A doctor in a second clinic. */
  otherDoctor: CurrentStaff;
  /** Valid input for the first clinic. */
  input: Record<string, unknown>;
};

class Rollback extends Error {}

/** One pool per test file; call `closeWorld()` in `after()`. */
const pool = new Pool({connectionString: process.env.DATABASE_URL});
const database = drizzle(pool);
export const closeWorld = () => pool.end();

/** Builds two clinics with staff, runs the test, then undoes everything. */
export async function inWorld(run: (world: World) => Promise<void>) {
  await database
    .transaction(async db => {
      const makeClinic = async (name: string) => {
        const [clinic] = await db
          .insert(clinics)
          .values({name, phone: '000 000 0000'})
          .returning({id: clinics.id});
        const member = async (role: 'doctor' | 'reception'): Promise<CurrentStaff> => {
          const [row] = await db
            .insert(staff)
            .values({
              clinicId: clinic.id,
              role,
              name: `Test ${role}`,
              email: `${randomUUID()}@test.example`,
            })
            .returning({id: staff.id});
          return {id: row.id, clinicId: clinic.id, role, name: `Test ${role}`};
        };
        return {reception: await member('reception'), doctor: await member('doctor')};
      };

      const first = await makeClinic('Test Clinic One');
      const second = await makeClinic('Test Clinic Two');
      await run({
        db,
        nexconn: new FakeNexconnServer(),
        reception: first.reception,
        doctor: first.doctor,
        otherDoctor: second.doctor,
        input: {
          patientName: 'Test Patient',
          patientPhone: '+91 0000 009876',
          windowDays: 7,
          visitNote: 'Test note.',
          doctorId: first.doctor.id,
        },
      });
      throw new Rollback();
    })
    .catch(error => {
      if (!(error instanceof Rollback)) throw error;
    });
}

/** Opens a follow-up in the first clinic and asserts it worked. */
export async function open(world: World, by: CurrentStaff = world.reception) {
  const created = await createFollowUp(world.db, by, world.input, world.nexconn);
  assert.ok(created.ok);
  return created;
}

/** Moves a follow-up's window into the past. */
export const expire = (db: Db, id: string) =>
  db
    .update(followUps)
    .set({startsAt: sql`now() - interval '8 days'`, endsAt: sql`now() - interval '1 day'`})
    .where(eq(followUps.id, id));
