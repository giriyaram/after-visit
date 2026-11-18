// Adds one staff member who can sign in. There is no public sign-up, so this
// script is the only way to create staff. Run with `npm run staff:create`.
import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {hashPassword} from 'better-auth/crypto';
import {and, eq, isNotNull} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import {channelIdFor, staffChatId} from '../chat/ids';
import {createNexconnServer} from '../chat/nexconn-server';
import {isOpen} from './follow-up-state';
import {clinics, followUps, staff, staffAccounts} from './schema';

const MIN_PASSWORD_LENGTH = 12;

// Typed answers are echoed through this stream, so it can hide the password.
let isHidden = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!isHidden) process.stdout.write(chunk);
    done();
  },
});
const reader = createInterface({
  input: process.stdin,
  output,
  terminal: process.stdin.isTTY,
});
const lines = reader[Symbol.asyncIterator]();

async function ask(question: string, options?: {isHidden: boolean}) {
  process.stdout.write(question);
  isHidden = options?.isHidden ?? false;
  const {value, done} = await lines.next();
  if (isHidden) process.stdout.write('\n');
  isHidden = false;
  if (done) throw new Error('No answer given.');
  return value.trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }

  const name = await ask('Name: ');
  if (!name) throw new Error('Enter a name.');

  const email = (await ask('Email: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }

  const role = await ask('Role (doctor or reception): ');
  if (role !== 'doctor' && role !== 'reception') {
    throw new Error('Role must be doctor or reception.');
  }

  // Asked at a prompt, not passed as an argument, so it stays out of the
  // shell history.
  const password = await ask('Password: ', {isHidden: true});
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  reader.close();

  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const db = drizzle(pool);
  try {
    const allClinics = await db.select({id: clinics.id, name: clinics.name}).from(clinics);
    if (allClinics.length !== 1) {
      throw new Error(`Expected one clinic, found ${allClinics.length}.`);
    }
    const [clinic] = allClinics;
    const passwordHash = await hashPassword(password);

    const created = await db.transaction(async tx => {
      const [row] = await tx
        .insert(staff)
        .values({clinicId: clinic.id, role, name, email})
        .returning({id: staff.id});
      await tx.insert(staffAccounts).values({
        userId: row.id,
        providerId: 'credential',
        accountId: row.id,
        password: passwordHash,
      });
      return row;
    });

    console.log(`Created ${role} ${name} (${email}) at ${clinic.name}.`);

    // Put the new member into every open follow-up's chat. Closed ones are
    // joined on demand when the member opens them.
    await joinOpenChats(db, clinic.id, created.id);
  } finally {
    await pool.end();
  }
}

async function joinOpenChats(db: ReturnType<typeof drizzle>, clinicId: string, staffId: string) {
  const appKey = process.env.NEXT_PUBLIC_NEXCONN_APP_KEY;
  const appSecret = process.env.NEXCONN_APP_SECRET;
  const primary = process.env.NEXCONN_API_BASE_URL;
  if (!appKey || !appSecret || !primary) {
    console.warn('Nexconn is not configured; the member joins each chat when they open it.');
    return;
  }
  const backup = process.env.NEXCONN_API_BASE_URL_BACKUP;
  const nexconn = createNexconnServer({appKey, appSecret, hosts: backup ? [primary, backup] : [primary]});

  const open = await db
    .select({id: followUps.id})
    .from(followUps)
    .where(and(eq(followUps.clinicId, clinicId), isOpen, isNotNull(followUps.chatChannelCreatedAt)));
  for (const {id} of open) {
    await nexconn.joinGroup(channelIdFor(id), [staffChatId(staffId)]);
  }
  console.log(`Joined ${open.length} open chat${open.length === 1 ? '' : 's'}.`);
}

main().catch(error => {
  reader.close();
  const isDuplicate = error?.cause?.code === '23505' || error?.code === '23505';
  console.error(isDuplicate ? 'A staff member with that email already exists.' : error.message);
  process.exit(1);
});
