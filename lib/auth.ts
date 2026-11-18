import 'server-only';
import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {nextCookies} from 'better-auth/next-js';
import {db} from './db/client';
import {
  rateLimits,
  staff,
  staffAccounts,
  staffSessions,
  verifications,
} from './db/schema';

// Staff sign-in: email and password only. Patients never get accounts.
// Staff are created by `npm run staff:create`, never through this API.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Better Auth's "user" is our staff table.
    schema: {
      user: staff,
      session: staffSessions,
      account: staffAccounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  advanced: {database: {generateId: 'uuid'}},

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },

  user: {
    // Set only by the staff script. `input: false` means no request to the
    // auth API can write them.
    additionalFields: {
      clinicId: {type: 'string', required: true, input: false},
      role: {type: 'string', required: true, input: false},
    },
  },

  // A session lasts 12 hours from sign-in. There is no cookie cache, so a
  // deleted session or a changed role applies on the next request.
  session: {expiresIn: 60 * 60 * 12},

  // Counted in the database so the limit holds across server instances.
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {'/sign-in/email': {window: 60, max: 5}},
  },

  // Only sign-in, sign-out and reading the session stay reachable.
  disabledPaths: [
    '/sign-up/email',
    '/sign-in/social',
    '/callback/:id',
    '/request-password-reset',
    '/reset-password',
    '/reset-password/:token',
    '/send-verification-email',
    '/verify-email',
    '/verify-password',
    '/change-email',
    '/change-password',
    '/update-user',
    '/update-session',
    '/delete-user',
    '/delete-user/callback',
    '/link-social',
    '/unlink-account',
    '/list-accounts',
    '/account-info',
    '/get-access-token',
    '/refresh-token',
    '/list-sessions',
    '/revoke-session',
    '/revoke-sessions',
    '/revoke-other-sessions',
  ],

  // Lets the sign-out server action clear the cookie. Must stay last.
  plugins: [nextCookies()],
});
