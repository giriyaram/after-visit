import {NextResponse} from 'next/server';
import {nexconn} from '@/lib/chat/server';
import {issueStaffInboxSession} from '@/lib/chat/sessions';
import {findCurrentStaff} from '@/lib/current-staff';

// Hands a signed-in staff member a Nexconn token for the inbox, where
// unread counts are read across all of their clinic's conversations.
export async function POST() {
  const staff = await findCurrentStaff();
  if (!staff) return NextResponse.json({ok: false, reason: 'no_session'}, {status: 401});

  const session = await issueStaffInboxSession(nexconn, staff);
  return NextResponse.json({ok: true, ...session}, {headers: {'Cache-Control': 'no-store'}});
}
