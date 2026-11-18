import {AppShell} from '@astryxdesign/core/AppShell';

// Patient frame, based on the Astryx `blank` template inside a content-only
// AppShell: a single column with no navigation. AppShell paints the page
// background and fills the screen. The clinic header lives in PatientFrame,
// because the clinic is only known once a page has looked up the link.
export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell contentPadding={0} mobileNav={false}>
      {children}
    </AppShell>
  );
}
