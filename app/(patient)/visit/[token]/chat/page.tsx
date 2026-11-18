import {Suspense} from 'react';
import {redirect} from 'next/navigation';
import {getLinkClinic, getPatientVisit} from '@/lib/data/follow-ups';
import {PatientFrame} from '../../../patient-frame';
import {PatientThread} from '../../patient-thread';
import {InvalidLink, VisitLoading} from '../../visit-states';

// getPatientVisit returns the follow-up only to a browser that has confirmed
// the phone digits for it. Open or closed comes from the database.
async function Chat({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const visit = await getPatientVisit(token);

  if (!visit) {
    // A real link without a session goes back to the digits check.
    if (await getLinkClinic(token)) redirect(`/visit/${encodeURIComponent(token)}`);
    return <InvalidLink />;
  }

  return (
    <PatientFrame clinic={visit.clinic}>
      <PatientThread
        token={token}
        clinic={visit.clinic}
        followUp={visit.followUp}
        staffNames={visit.staffNames}
      />
    </PatientFrame>
  );
}

export default function PatientChatPage({
  params,
}: PageProps<'/visit/[token]/chat'>) {
  return (
    <Suspense fallback={<VisitLoading />}>
      <Chat params={params} />
    </Suspense>
  );
}
