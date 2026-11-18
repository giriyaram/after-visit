import {NextResponse} from 'next/server';
import {nexconn} from '@/lib/chat/server';
import {getStaffChatState} from '@/lib/chat/sessions';
import {findCurrentStaff} from '@/lib/current-staff';
import {db} from '@/lib/db/client';

// Where the window stands for one of the clinic's follow-ups. The staff
// conversation polls it so the end of the window shows without a reload.
export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  const staff = await findCurrentStaff();
  if (!staff) return NextResponse.json({ok: false, reason: 'no_session'}, {status: 401});
  const {id} = await context.params;
  const state = await getStaffChatState(db, nexconn, staff, id);
  if (!state) return NextResponse.json({ok: false, reason: 'not_found'}, {status: 404});
  return NextResponse.json({ok: true, ...state}, {headers: {'Cache-Control': 'no-store'}});
}
