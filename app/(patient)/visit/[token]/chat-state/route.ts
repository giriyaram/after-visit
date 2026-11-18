import {NextResponse} from 'next/server';
import {nexconn} from '@/lib/chat/server';
import {getPatientChatState} from '@/lib/chat/sessions';
import {db} from '@/lib/db/client';
import {getPatientSessionToken} from '@/lib/patient-session';

// Where the window stands for this link's follow-up. The patient page polls
// it so a close by staff, or the end time passing, shows without a reload.
// Asking also runs the gate, so the patient is muted once the window ends.
export async function GET(_request: Request, context: {params: Promise<{token: string}>}) {
  const {token} = await context.params;
  const state = await getPatientChatState(db, nexconn, token, await getPatientSessionToken());
  if (!state) return NextResponse.json({ok: false, reason: 'no_session'}, {status: 401});
  return NextResponse.json({ok: true, ...state}, {headers: {'Cache-Control': 'no-store'}});
}
