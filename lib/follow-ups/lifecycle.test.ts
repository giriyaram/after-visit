// Runs against the real database. Each test works inside a transaction that
// is rolled back, so nothing it writes is kept; see test-world.ts.
import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import {eq, sql} from 'drizzle-orm';
import {isOpen} from '../db/follow-up-state';
import {followUps, patientSessions} from '../db/schema';
import {patientChatId} from '../chat/ids';
import {hashToken} from '../link-token';
import {
  checkPatientCanWrite,
  closeEarly,
  createFollowUp,
  extendWindow,
  findSessionFollowUp,
  regenerateLinkToken,
  setFlag,
  verifyEntry,
  type Db,
} from './lifecycle';
import {closeWorld, expire, inWorld, open} from './test-world';

after(closeWorld);

const read = async (db: Db, id: string) => {
  const [row] = await db
    .select({
      clinicId: followUps.clinicId,
      patientPhone: followUps.patientPhone,
      linkTokenHash: followUps.linkTokenHash,
      isOpen,
      flaggedAt: followUps.flaggedForDoctorAt,
      closedEarlyAt: followUps.closedEarlyAt,
      consentedAt: followUps.consentedAt,
      attempts: followUps.failedVerifyAttempts,
      lockedUntil: followUps.verifyLockedUntil,
      daysOpen: sql<number>`round(extract(epoch from ${followUps.endsAt} - ${followUps.startsAt}) / 86400)::int`,
      daysLeft: sql<number>`round(extract(epoch from ${followUps.endsAt} - now()) / 86400)::int`,
      everything: sql<string>`row_to_json(${followUps})::text`,
    })
    .from(followUps)
    .where(eq(followUps.id, id));
  return row;
};

const sessionCount = async (db: Db, id: string) =>
  (await db.select().from(patientSessions).where(eq(patientSessions.followUpId, id))).length;

// ---------------------------------------------------------------- create

test('create: either role opens a follow-up in their own clinic', () =>
  inWorld(async world => {
    for (const by of [world.reception, world.doctor]) {
      const created = await open(world, by);
      const row = await read(world.db, created.id);
      assert.equal(row.clinicId, by.clinicId);
      assert.equal(row.isOpen, true);
      assert.equal(row.daysOpen, 7);
      assert.equal(row.patientPhone, '+910000009876');
    }
  }));

test('create: only the hash of the link token is stored', () =>
  inWorld(async world => {
    const created = await open(world);
    const row = await read(world.db, created.id);
    assert.equal(created.token.length, 43);
    assert.equal(row.linkTokenHash, hashToken(created.token));
    assert.ok(!row.everything.includes(created.token));
  }));

test('create: refuses invalid input, another clinic’s doctor, and a non-doctor', () =>
  inWorld(async world => {
    const attempt = (changes: Record<string, unknown>) =>
      createFollowUp(world.db, world.reception, {...world.input, ...changes}, world.nexconn);

    assert.equal((await attempt({windowDays: 5})).ok, false);
    assert.equal((await attempt({doctorId: world.otherDoctor.id})).ok, false);
    assert.equal((await attempt({doctorId: world.reception.id})).ok, false);
    const [{count}] = await world.db
      .select({count: sql<number>`count(*)::int`})
      .from(followUps)
      .where(eq(followUps.clinicId, world.reception.clinicId));
    assert.equal(count, 0);
  }));

test('create: the 2-minute dev window is refused unless allowed, and ends in minutes', () =>
  inWorld(async world => {
    const input = {...world.input, windowDays: 'dev-2-minutes'};
    const refused = await createFollowUp(world.db, world.reception, input, world.nexconn);
    assert.equal(refused.ok, false);

    const allowed = await createFollowUp(world.db, world.reception, input, world.nexconn, {
      allowDevWindow: true,
    });
    assert.ok(allowed.ok);
    const [row] = await world.db
      .select({
        isOpen,
        windowDays: followUps.windowDays,
        minutesOpen: sql<number>`round(extract(epoch from ${followUps.endsAt} - ${followUps.startsAt}) / 60)::int`,
      })
      .from(followUps)
      .where(eq(followUps.id, allowed.id));
    assert.equal(row.isOpen, true);
    assert.equal(row.minutesOpen, 2);
    assert.equal(row.windowDays, 3);
  }));

// ------------------------------------------------------------ regenerate

test('regenerate: the old link dies, sessions end, the lock clears', () =>
  inWorld(async world => {
    const created = await open(world);
    const entry = await verifyEntry(world.db, created.token, '9876', true);
    assert.ok(entry.ok);
    await world.db
      .update(followUps)
      .set({failedVerifyAttempts: 3, verifyLockedUntil: sql`now() + interval '10 minutes'`})
      .where(eq(followUps.id, created.id));

    const renewed = await regenerateLinkToken(world.db, world.doctor, created.id, world.nexconn);
    assert.ok(renewed.ok);
    assert.notEqual(renewed.token, created.token);

    // The chat drops whoever was in it through the old link.
    assert.equal(renewed.isChatRevoked, true);
    const patient = patientChatId(created.id);
    const [expired] = world.nexconn.of('expireTokens');
    assert.equal(expired.userId, patient);
    assert.ok(expired.beforeMs >= Date.now());
    assert.deepEqual(world.nexconn.of('disconnectUser'), [{kind: 'disconnectUser', userId: patient}]);

    const row = await read(world.db, created.id);
    assert.equal(row.linkTokenHash, hashToken(renewed.token));
    assert.equal(row.attempts, 0);
    assert.equal(row.lockedUntil, null);
    assert.equal(await sessionCount(world.db, created.id), 0);

    const old = await verifyEntry(world.db, created.token, '9876', true);
    assert.deepEqual(old, {ok: false, reason: 'invalid_link'});
    assert.equal((await verifyEntry(world.db, renewed.token, '9876', true)).ok, true);
  }));

test('regenerate: another clinic’s follow-up is not found', () =>
  inWorld(async world => {
    const created = await open(world);
    const result = await regenerateLinkToken(world.db, world.otherDoctor, created.id, world.nexconn);
    assert.deepEqual(result, {ok: false, reason: 'not_found'});
    assert.equal((await read(world.db, created.id)).linkTokenHash, hashToken(created.token));
    assert.equal(world.nexconn.of('expireTokens').length, 0);
    assert.equal(world.nexconn.of('disconnectUser').length, 0);
  }));

test('regenerate: a Nexconn outage still replaces the link, and says chat was not revoked', () =>
  inWorld(async world => {
    const created = await open(world);
    world.nexconn.failure = new Error('outage');
    const renewed = await regenerateLinkToken(world.db, world.doctor, created.id, world.nexconn);
    world.nexconn.failure = undefined;
    assert.ok(renewed.ok);
    assert.equal(renewed.isChatRevoked, false);
    assert.equal((await read(world.db, created.id)).linkTokenHash, hashToken(renewed.token));
  }));

// ----------------------------------------------------------------- entry

test('entry: right digits with consent create a session and record consent', () =>
  inWorld(async world => {
    const created = await open(world);
    assert.deepEqual(await verifyEntry(world.db, created.token, '9876', false), {
      ok: false,
      reason: 'consent_required',
    });
    assert.deepEqual(await verifyEntry(world.db, created.token, '98765', true), {
      ok: false,
      reason: 'invalid_digits',
    });
    assert.equal((await read(world.db, created.id)).consentedAt, null);

    const entry = await verifyEntry(world.db, created.token, '9876', true);
    assert.ok(entry.ok);
    assert.ok((await read(world.db, created.id)).consentedAt);

    // Only the hash of the session token is stored.
    const [session] = await world.db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.followUpId, created.id));
    assert.equal(session.tokenHash, hashToken(entry.sessionToken));
  }));

test('entry: four wrong tries then the right digits succeed', () =>
  inWorld(async world => {
    const created = await open(world);
    for (const attemptsLeft of [4, 3, 2, 1]) {
      assert.deepEqual(await verifyEntry(world.db, created.token, '0000', true), {
        ok: false,
        reason: 'wrong_digits',
        attemptsLeft,
      });
    }
    assert.equal((await verifyEntry(world.db, created.token, '9876', true)).ok, true);
    assert.equal((await read(world.db, created.id)).attempts, 0);
  }));

test('entry: the fifth wrong try locks; right digits are refused until it ends', () =>
  inWorld(async world => {
    const created = await open(world);
    for (let attempt = 1; attempt <= 4; attempt++) {
      await verifyEntry(world.db, created.token, '0000', true);
    }
    assert.deepEqual(await verifyEntry(world.db, created.token, '0000', true), {
      ok: false,
      reason: 'locked',
      minutesLeft: 15,
    });
    const whileLocked = await verifyEntry(world.db, created.token, '9876', true);
    assert.equal(whileLocked.ok, false);
    assert.equal(!whileLocked.ok && whileLocked.reason, 'locked');
    assert.equal(await sessionCount(world.db, created.id), 0);

    // Move the lock into the past, as if 15 minutes had gone by.
    await world.db
      .update(followUps)
      .set({verifyLockedUntil: sql`now() - interval '1 second'`})
      .where(eq(followUps.id, created.id));
    assert.equal((await verifyEntry(world.db, created.token, '9876', true)).ok, true);
  }));

test('entry: works on a closed follow-up, so the patient can still read it', () =>
  inWorld(async world => {
    const created = await open(world);
    await expire(world.db, created.id);
    assert.equal((await verifyEntry(world.db, created.token, '9876', true)).ok, true);
  }));

// --------------------------------------------------------- session scope

test('session: opens its own follow-up and no other', () =>
  inWorld(async world => {
    const first = await open(world);
    const second = await open(world);
    const entry = await verifyEntry(world.db, first.token, '9876', true);
    assert.ok(entry.ok);

    const find = (token: unknown, session: unknown) =>
      findSessionFollowUp(world.db, token, session);
    assert.equal(await find(first.token, entry.sessionToken), first.id);
    assert.equal(await find(second.token, entry.sessionToken), undefined);
    assert.equal(await find(first.token, 'made-up-session'), undefined);
    assert.equal(await find(first.token, undefined), undefined);

    // An expired session opens nothing.
    await world.db
      .update(patientSessions)
      .set({expiresAt: sql`now() - interval '1 second'`})
      .where(eq(patientSessions.followUpId, first.id));
    assert.equal(await find(first.token, entry.sessionToken), undefined);
  }));

// ------------------------------------------------- flag and close early

test('flag: set and clear while open; repeating changes nothing', () =>
  inWorld(async world => {
    const created = await open(world);
    assert.deepEqual(await setFlag(world.db, world.reception, created.id, true), {ok: true});
    const firstFlag = (await read(world.db, created.id)).flaggedAt;
    assert.ok(firstFlag);
    assert.deepEqual(await setFlag(world.db, world.doctor, created.id, true), {ok: true});
    assert.deepEqual((await read(world.db, created.id)).flaggedAt, firstFlag);
    assert.deepEqual(await setFlag(world.db, world.doctor, created.id, false), {ok: true});
    assert.equal((await read(world.db, created.id)).flaggedAt, null);
  }));

test('flag and close early: refused when expired or closed early', () =>
  inWorld(async world => {
    const expired = await open(world);
    await expire(world.db, expired.id);
    const closed = await open(world);
    assert.deepEqual(await closeEarly(world.db, world.reception, closed.id, world.nexconn), {ok: true});
    assert.equal((await read(world.db, closed.id)).isOpen, false);

    const refused = {ok: false, reason: 'closed'};
    for (const {id} of [expired, closed]) {
      assert.deepEqual(await setFlag(world.db, world.reception, id, true), refused);
      assert.deepEqual(await closeEarly(world.db, world.reception, id, world.nexconn), refused);
      assert.equal((await read(world.db, id)).flaggedAt, null);
    }
    assert.equal((await read(world.db, expired.id)).closedEarlyAt, null);
  }));

test('flag and close early: another clinic’s follow-up is not found and unchanged', () =>
  inWorld(async world => {
    const created = await open(world);
    const notFound = {ok: false, reason: 'not_found'};
    assert.deepEqual(await setFlag(world.db, world.otherDoctor, created.id, true), notFound);
    assert.deepEqual(await closeEarly(world.db, world.otherDoctor, created.id, world.nexconn), notFound);
    assert.deepEqual(await closeEarly(world.db, world.reception, 'not-an-id', world.nexconn), notFound);

    const row = await read(world.db, created.id);
    assert.equal(row.flaggedAt, null);
    assert.equal(row.isOpen, true);
  }));

// ---------------------------------------------------------------- extend

test('extend: reopens an expired follow-up for 7 days, once', () =>
  inWorld(async world => {
    const created = await open(world);
    await expire(world.db, created.id);
    let charges = 0;
    const charge = async () => ({ok: true as const, reference: `test_${++charges}`});

    assert.deepEqual(await extendWindow(world.db, created.id, charge, world.nexconn), {ok: true});
    const row = await read(world.db, created.id);
    assert.equal(row.isOpen, true);
    assert.equal(row.daysLeft, 7);

    // A second tap finds it open and does not charge again.
    assert.deepEqual(await extendWindow(world.db, created.id, charge, world.nexconn), {
      ok: false,
      reason: 'still_open',
    });
    assert.equal(charges, 1);
  }));

test('extend: refused when closed early, and when payment fails; no charge when ineligible', () =>
  inWorld(async world => {
    let charges = 0;
    const charge = async () => ({ok: true as const, reference: `test_${++charges}`});

    const closed = await open(world);
    await closeEarly(world.db, world.reception, closed.id, world.nexconn);
    // Even once its time has also run out, staff's decision stands.
    await expire(world.db, closed.id);
    assert.deepEqual(await extendWindow(world.db, closed.id, charge, world.nexconn), {
      ok: false,
      reason: 'closed_by_clinic',
    });
    assert.equal(charges, 0);
    assert.equal((await read(world.db, closed.id)).isOpen, false);

    const expired = await open(world);
    await expire(world.db, expired.id);
    assert.deepEqual(await extendWindow(world.db, expired.id, async () => ({ok: false}), world.nexconn), {
      ok: false,
      reason: 'payment_failed',
    });
    assert.equal((await read(world.db, expired.id)).isOpen, false);
  }));

// ------------------------------------------------- closed means closed

test('closed: a patient with a valid session cannot add anything once the window ends', () =>
  inWorld(async world => {
    const created = await open(world);
    const entry = await verifyEntry(world.db, created.token, '9876', true);
    assert.ok(entry.ok);
    const canWrite = () => checkPatientCanWrite(world.db, created.token, entry.sessionToken);

    assert.deepEqual(await canWrite(), {ok: true, followUpId: created.id});

    // The window runs out while the patient still has the chat open.
    await expire(world.db, created.id);
    assert.deepEqual(await canWrite(), {ok: false, reason: 'closed'});
    // The session itself is still good, so they can keep reading.
    assert.equal(await findSessionFollowUp(world.db, created.token, entry.sessionToken), created.id);
  }));

test('closed: closing early stops patient writes at once, and paying cannot undo it', () =>
  inWorld(async world => {
    const created = await open(world);
    const entry = await verifyEntry(world.db, created.token, '9876', true);
    assert.ok(entry.ok);
    const canWrite = () => checkPatientCanWrite(world.db, created.token, entry.sessionToken);
    assert.equal((await canWrite()).ok, true);

    await closeEarly(world.db, world.doctor, created.id, world.nexconn);
    assert.deepEqual(await canWrite(), {ok: false, reason: 'closed'});

    const extended = await extendWindow(world.db, created.id, async () => ({
      ok: true,
      reference: 'test',
    }), world.nexconn);
    assert.deepEqual(extended, {ok: false, reason: 'closed_by_clinic'});
    assert.deepEqual(await canWrite(), {ok: false, reason: 'closed'});
  }));

test('closed: without a session, or with another link’s session, nothing can be written', () =>
  inWorld(async world => {
    const first = await open(world);
    const second = await open(world);
    const entry = await verifyEntry(world.db, first.token, '9876', true);
    assert.ok(entry.ok);

    const noSession = {ok: false, reason: 'no_session'};
    assert.deepEqual(await checkPatientCanWrite(world.db, first.token, undefined), noSession);
    assert.deepEqual(
      await checkPatientCanWrite(world.db, second.token, entry.sessionToken),
      noSession,
    );
  }));
