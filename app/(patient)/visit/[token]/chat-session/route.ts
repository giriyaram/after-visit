import {NextResponse} from 'next/server';
import {nexconn} from '@/lib/chat/server';
import {issuePatientChatSession} from '@/lib/chat/sessions';
import {db} from '@/lib/db/client';
import {getPatientSessionToken} from '@/lib/patient-session';

// Hands the patient's browser a Nexconn token for this link's follow-up.
// It lives under /visit/<token> because the session cookie is scoped to that
// path; the cookie and the link must agree or there is no session. No state
// check: a closed follow-up is still readable, and the mute stops sending.
export async function POST(_request: Request, context: {params: Promise<{token: string}>}) {
  const {token} = await context.params;
  const result = await issuePatientChatSession(db, nexconn, token, await getPatientSessionToken());
  if (!result.ok) {
    return NextResponse.json({ok: false, reason: result.reason}, {status: 401});
  }
  return NextResponse.json({ok: true, ...result.session}, {headers: {'Cache-Control': 'no-store'}});
}
