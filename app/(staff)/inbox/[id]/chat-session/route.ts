import {NextResponse} from 'next/server';
import {nexconn} from '@/lib/chat/server';
import {issueStaffChatSession} from '@/lib/chat/sessions';
import {findCurrentStaff} from '@/lib/current-staff';
import {db} from '@/lib/db/client';

// Hands a signed-in staff member a Nexconn token for one follow-up's chat.
// Another clinic's follow-up is reported as not found, like everywhere else.
export async function POST(_request: Request, context: {params: Promise<{id: string}>}) {
  const staff = await findCurrentStaff();
  if (!staff) return NextResponse.json({ok: false, reason: 'no_session'}, {status: 401});

  const {id} = await context.params;
  const result = await issueStaffChatSession(db, nexconn, staff, id);
  if (!result.ok) {
    return NextResponse.json({ok: false, reason: result.reason}, {status: 404});
  }
  return NextResponse.json({ok: true, ...result.session}, {headers: {'Cache-Control': 'no-store'}});
}
