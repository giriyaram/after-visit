// Chat provisioning and token issue against the real database, with a fake
// Nexconn. What matters here is who gets a token for which channel, and
// when the patient is muted.
import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import {eq} from 'drizzle-orm';
import {followUps} from '../db/schema';
import {closeEarly, extendWindow, verifyEntry} from '../follow-ups/lifecycle';
import {closeWorld, expire, inWorld, open} from '../follow-ups/test-world';
import {ensureChannel, msUntilNextWindowEnd, muteEndedWindows, syncPatientGate} from './channel';
import {channelIdFor, followUpIdFromChannelId, patientChatId, staffChatId} from './ids';
import {
  getPatientChatState,
  getStaffChatState,
  issuePatientChatSession,
  issueStaffChatSession,
} from './sessions';

after(closeWorld);

const chatColumns = async (db: Parameters<typeof ensureChannel>[0], id: string) => {
  const [row] = await db
    .select({createdAt: followUps.chatChannelCreatedAt, mutedAt: followUps.chatPatientMutedAt})
    .from(followUps)
    .where(eq(followUps.id, id));
  return row;
};

test('ids: derived from uuids, letters and digits only, and reversible', () => {
  const id = '0f3d8c2a-1b4e-4f6a-9c7d-2e1f0a9b8c7d';
  assert.equal(channelIdFor(id), 'f0f3d8c2a1b4e4f6a9c7d2e1f0a9b8c7d');
  assert.match(staffChatId(id), /^s[0-9a-f]{32}$/);
  assert.match(patientChatId(id), /^p[0-9a-f]{32}$/);
  assert.equal(followUpIdFromChannelId(channelIdFor(id)), id);
  assert.equal(followUpIdFromChannelId('nonsense'), undefined);
});

test('create: opens a group with the patient and every clinic member, once', () =>
  inWorld(async world => {
    const created = await open(world);
    const channelId = channelIdFor(created.id);

    const [call] = world.nexconn.of('createGroup');
    assert.equal(world.nexconn.of('createGroup').length, 1);
    assert.equal(call.input.channelId, channelId);
    assert.equal(call.input.owner, staffChatId(world.doctor.id));
    assert.deepEqual(
      new Set(world.nexconn.groups.get(channelId)),
      new Set([patientChatId(created.id), staffChatId(world.doctor.id), staffChatId(world.reception.id)]),
    );
    // The other clinic's staff are not in it.
    assert.ok(!world.nexconn.groups.get(channelId)?.has(staffChatId(world.otherDoctor.id)));
    assert.ok((await chatColumns(world.db, created.id)).createdAt);

    // Calling again does nothing more.
    assert.equal(await ensureChannel(world.db, world.nexconn, created.id), channelId);
    assert.equal(world.nexconn.of('createGroup').length, 1);
  }));

test('create: a Nexconn outage keeps the follow-up and leaves the channel for later', () =>
  inWorld(async world => {
    world.nexconn.failure = new Error('outage');
    const created = await open(world);
    assert.equal((await chatColumns(world.db, created.id)).createdAt, null);

    world.nexconn.failure = undefined;
    assert.equal(await ensureChannel(world.db, world.nexconn, created.id), channelIdFor(created.id));
    assert.ok((await chatColumns(world.db, created.id)).createdAt);
    assert.equal(world.nexconn.of('createGroup').length, 1);
  }));

test('staff token: only for a follow-up in their own clinic, in any state', () =>
  inWorld(async world => {
    const created = await open(world);
    const channelId = channelIdFor(created.id);

    const mine = await issueStaffChatSession(world.db, world.nexconn, world.doctor, created.id);
    assert.ok(mine.ok);
    assert.equal(mine.session.channelId, channelId);
    assert.equal(mine.session.userId, staffChatId(world.doctor.id));
    assert.equal(mine.session.isOpen, true);
    assert.deepEqual(world.nexconn.of('issueToken').at(-1), {
      kind: 'issueToken',
      userId: staffChatId(world.doctor.id),
      name: world.doctor.name,
    });

    const theirs = await issueStaffChatSession(world.db, world.nexconn, world.otherDoctor, created.id);
    assert.deepEqual(theirs, {ok: false, reason: 'not_found'});
    assert.deepEqual(await issueStaffChatSession(world.db, world.nexconn, world.doctor, 'nope'), {
      ok: false,
      reason: 'not_found',
    });
    // No token was issued for the refused calls.
    assert.equal(world.nexconn.of('issueToken').length, 1);

    // Closed follow-ups still open for staff.
    await closeEarly(world.db, world.reception, created.id, world.nexconn);
    const afterClose = await issueStaffChatSession(world.db, world.nexconn, world.reception, created.id);
    assert.ok(afterClose.ok);
    assert.equal(afterClose.session.isOpen, false);
  }));

test('patient token: needs this link’s session; still issued once closed, but muted', () =>
  inWorld(async world => {
    const first = await open(world);
    const second = await open(world);
    const entry = await verifyEntry(world.db, first.token, '9876', true);
    assert.ok(entry.ok);

    const noSession = {ok: false, reason: 'no_session'};
    assert.deepEqual(await issuePatientChatSession(world.db, world.nexconn, first.token, undefined), noSession);
    assert.deepEqual(
      await issuePatientChatSession(world.db, world.nexconn, second.token, entry.sessionToken),
      noSession,
    );
    assert.equal(world.nexconn.of('issueToken').length, 0);

    const granted = await issuePatientChatSession(world.db, world.nexconn, first.token, entry.sessionToken);
    assert.ok(granted.ok);
    assert.equal(granted.session.channelId, channelIdFor(first.id));
    assert.equal(granted.session.userId, patientChatId(first.id));
    assert.equal(granted.session.isOpen, true);
    assert.equal(world.nexconn.isMuted(channelIdFor(first.id), patientChatId(first.id)), false);
    // The push name is not the patient's name.
    assert.equal(world.nexconn.of('issueToken')[0].name, 'Patient');
    // Muted in direct channels before the token is issued.
    assert.deepEqual(world.nexconn.of('muteInDirectChannels'), [
      {kind: 'muteInDirectChannels', userId: patientChatId(first.id)},
    ]);
    const order = world.nexconn.calls.map(c => c.kind);
    assert.ok(order.indexOf('muteInDirectChannels') < order.indexOf('issueToken'));
    // Staff tokens never mute anyone in direct channels.
    await issueStaffChatSession(world.db, world.nexconn, world.doctor, first.id);
    assert.equal(world.nexconn.of('muteInDirectChannels').length, 1);

    // The window runs out. The next token request mutes them and says so.
    await expire(world.db, first.id);
    const later = await issuePatientChatSession(world.db, world.nexconn, first.token, entry.sessionToken);
    assert.ok(later.ok);
    assert.equal(later.session.isOpen, false);
    assert.equal(world.nexconn.isMuted(channelIdFor(first.id), patientChatId(first.id)), true);
  }));

test('gate: close early mutes at once, extend unmutes, and repeats do nothing', () =>
  inWorld(async world => {
    const created = await open(world);
    const channelId = channelIdFor(created.id);
    const patient = patientChatId(created.id);

    await closeEarly(world.db, world.doctor, created.id, world.nexconn);
    assert.equal(world.nexconn.isMuted(channelId, patient), true);
    assert.ok((await chatColumns(world.db, created.id)).mutedAt);
    await syncPatientGate(world.db, world.nexconn, created.id);
    assert.equal(world.nexconn.of('muteMember').length, 1);

    // A timed-out follow-up is muted by the sync, then unmuted by extend.
    const expired = await open(world);
    await expire(world.db, expired.id);
    await syncPatientGate(world.db, world.nexconn, expired.id);
    assert.equal(world.nexconn.isMuted(channelIdFor(expired.id), patientChatId(expired.id)), true);

    const extended = await extendWindow(
      world.db,
      expired.id,
      async () => ({ok: true, reference: 'test'}),
      world.nexconn,
    );
    assert.deepEqual(extended, {ok: true});
    assert.equal(world.nexconn.isMuted(channelIdFor(expired.id), patientChatId(expired.id)), false);
    assert.equal((await chatColumns(world.db, expired.id)).mutedAt, null);
  }));

test('gate: a Nexconn outage does not undo the close', () =>
  inWorld(async world => {
    const created = await open(world);
    world.nexconn.failure = new Error('outage');
    assert.deepEqual(await closeEarly(world.db, world.doctor, created.id, world.nexconn), {ok: true});
    assert.equal((await chatColumns(world.db, created.id)).mutedAt, null);

    world.nexconn.failure = undefined;
    await syncPatientGate(world.db, world.nexconn, created.id);
    assert.equal(world.nexconn.isMuted(channelIdFor(created.id), patientChatId(created.id)), true);
  }));

test('sweep: mutes ended follow-ups with nobody asking, leaves open ones, retries failures', () =>
  inWorld(async world => {
    const ended = await open(world);
    const stillOpen = await open(world);
    const failedClose = await open(world);
    await expire(world.db, ended.id);
    // Close early during an outage: closed, but the mute did not happen.
    world.nexconn.failure = new Error('outage');
    await closeEarly(world.db, world.doctor, failedClose.id, world.nexconn);
    world.nexconn.failure = undefined;

    const muted = (id: string) => world.nexconn.isMuted(channelIdFor(id), patientChatId(id));
    assert.equal(muted(ended.id), false);

    await muteEndedWindows(world.db, world.nexconn);
    assert.equal(muted(ended.id), true);
    assert.equal(muted(failedClose.id), true);
    assert.equal(muted(stillOpen.id), false);
    assert.ok((await chatColumns(world.db, ended.id)).mutedAt);

    // A second sweep sends nothing more for these.
    const mutesBefore = world.nexconn.of('muteMember').length;
    await muteEndedWindows(world.db, world.nexconn);
    const ours = new Set([ended.id, failedClose.id].map(id => patientChatId(id)));
    assert.equal(
      world.nexconn.of('muteMember').slice(mutesBefore).filter(c => ours.has(c.userId)).length,
      0,
    );

    // The sweeper sleeps until the soonest open window ends.
    const ms = await msUntilNextWindowEnd(world.db);
    assert.ok(ms !== undefined && ms > 0);
  }));

test('state: ending mutes on the next ask, extend unmutes and reopens the same channel', () =>
  inWorld(async world => {
    const created = await open(world);
    const entry = await verifyEntry(world.db, created.token, '9876', true);
    assert.ok(entry.ok);
    const channelId = channelIdFor(created.id);
    const patient = patientChatId(created.id);
    const ask = () => getPatientChatState(world.db, world.nexconn, created.token, entry.sessionToken);

    const before = await ask();
    assert.ok(before && before.isOpen && !before.isClosedEarly);
    assert.ok(Date.parse(before.endsAt) > Date.parse(before.serverNow));

    await expire(world.db, created.id);
    const ended = await ask();
    assert.ok(ended && !ended.isOpen && !ended.isClosedEarly);
    assert.equal(world.nexconn.isMuted(channelId, patient), true);

    const extended = await extendWindow(
      world.db,
      created.id,
      async () => ({ok: true, reference: 'test'}),
      world.nexconn,
    );
    assert.deepEqual(extended, {ok: true});
    const reopened = await ask();
    assert.ok(reopened && reopened.isOpen);
    assert.equal(world.nexconn.isMuted(channelId, patient), false);
    // Still the one channel: nothing was created again.
    assert.equal(world.nexconn.of('createGroup').length, 1);

    // Staff see the same state for their clinic's follow-up and no other.
    const staffView = await getStaffChatState(world.db, world.nexconn, world.doctor, created.id);
    assert.ok(staffView && staffView.isOpen);
    assert.equal(await getStaffChatState(world.db, world.nexconn, world.otherDoctor, created.id), undefined);
  }));

test('state: without a session there is no state', () =>
  inWorld(async world => {
    const created = await open(world);
    assert.equal(await getPatientChatState(world.db, world.nexconn, created.token, undefined), undefined);
    assert.equal(world.nexconn.of('issueToken').length, 0);
  }));
