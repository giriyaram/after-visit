import 'server-only';
import {cache} from 'react';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {auth} from './auth';

export type StaffRole = 'doctor' | 'reception';

export type CurrentStaff = {
  id: string;
  clinicId: string;
  role: StaffRole;
  name: string;
};

/**
 * The signed-in staff member, checked against the database on every request.
 * Sends the visitor to the sign-in page when there is no valid session.
 *
 * Every staff page, data function and server action must go through this. The proxy and the layout are not the protection.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff> => {
  const staff = await findCurrentStaff();
  if (!staff) redirect('/sign-in');
  return staff;
});

/**
 * The same check for route handlers, which answer 401 instead of
 * redirecting. Pages and server actions use getCurrentStaff().
 */
export const findCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
    // A page render cannot set cookies, so the session is not extended here.
    query: {disableRefresh: true},
  });
  if (!session) return null;

  const {id, name, clinicId, role} = session.user;
  if (role !== 'doctor' && role !== 'reception') {
    throw new Error('Staff member has an unknown role.');
  }
  return {id, name, clinicId, role};
});
