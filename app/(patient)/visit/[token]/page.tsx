import {Suspense} from 'react';
import {redirect} from 'next/navigation';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {getLinkClinic} from '@/lib/data/follow-ups';
import {getPatientSessionFollowUp} from '@/lib/patient-session';
import {PatientFrame} from '../../patient-frame';
import {EntryForm} from '../entry-form';
import {InvalidLink, VisitLoading} from '../visit-states';

// Before the phone digits are confirmed, a link shows only its clinic.
async function Entry({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const clinic = await getLinkClinic(token);
  if (!clinic) return <InvalidLink />;

  // This browser has already confirmed the digits for this follow-up.
  if (await getPatientSessionFollowUp(token)) {
    redirect(`/visit/${encodeURIComponent(token)}/chat`);
  }

  return (
    <PatientFrame clinic={clinic}>
      <LayoutContent padding={4}>
        <EntryForm token={token} clinicName={clinic.name} />
      </LayoutContent>
    </PatientFrame>
  );
}

export default function PatientEntryPage({params}: PageProps<'/visit/[token]'>) {
  return (
    <Suspense fallback={<VisitLoading />}>
      <Entry params={params} />
    </Suspense>
  );
}
