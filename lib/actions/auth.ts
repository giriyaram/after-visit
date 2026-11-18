'use server';

import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {auth} from '@/lib/auth';
import {getCurrentStaff} from '@/lib/current-staff';

/** Ends the current staff session and returns to the sign-in page. */
export async function signOut() {
  // Like every staff action: no session, no action. This redirects to the
  // sign-in page before anything else runs.
  await getCurrentStaff();
  await auth.api.signOut({headers: await headers()});
  redirect('/sign-in');
}
