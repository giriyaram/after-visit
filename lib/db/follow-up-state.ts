import {sql} from 'drizzle-orm';
import {followUps} from './schema';

// The one place the open rule lives. It uses the database clock, so every
// query and write agrees on what "now" is.
export const isOpen = sql<boolean>`(${followUps.startsAt} <= now() and now() < ${followUps.endsAt} and ${followUps.closedEarlyAt} is null)`;

/** Whole days left in the window, rounded up; 0 once it has ended. */
export const daysRemaining = sql<number>`greatest(ceil(extract(epoch from ${followUps.endsAt} - now()) / 86400), 0)::int`;
