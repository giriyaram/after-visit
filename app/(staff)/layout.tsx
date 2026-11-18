import {Suspense} from 'react';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {getCurrentStaff} from '@/lib/current-staff';
import {getStaffClinic} from '@/lib/data/follow-ups';
import {StaffAccount, StaffHeading, StaffNavItems, StaffShell} from './staff-shell';

// The layout only decides what the side rail and the header show. It is not the sign-in
// check: every page and data function calls getCurrentStaff() itself.
async function Account() {
  const {name, role} = await getCurrentStaff();
  return <StaffAccount name={name} role={role} />;
}

async function Heading() {
  const clinic = await getStaffClinic();
  return <StaffHeading clinicName={clinic.name} />;
}

export default function StaffLayout({children}: {children: React.ReactNode}) {
  return (
    <StaffShell
      heading={
        <Suspense fallback={<StaffHeading />}>
          <Heading />
        </Suspense>
      }
      nav={
        <Suspense fallback={null}>
          <StaffNavItems />
        </Suspense>
      }
      account={
        <Suspense fallback={<Skeleton width={160} height={32} />}>
          <Account />
        </Suspense>
      }>
      {children}
    </StaffShell>
  );
}
