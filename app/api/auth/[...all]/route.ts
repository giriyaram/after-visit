import {toNextJsHandler} from 'better-auth/next-js';
import {auth} from '@/lib/auth';

// Better Auth's endpoints. lib/auth.ts disables all of them except sign-in,
// sign-out and reading the session.
export const {GET, POST} = toNextJsHandler(auth);
