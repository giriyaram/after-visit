import {EmptyState} from '@astryxdesign/core/EmptyState';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {PatientFrame} from './(patient)/patient-frame';

// A patient who mistypes or truncates their link lands here, so it keeps
// the "Not for emergencies" line. The clinic is unknown, so the banner
// says to call your clinic rather than showing a number.
export default function NotFound() {
  return (
    <PatientFrame>
      <LayoutContent padding={4}>
        <EmptyState
          headingLevel={1}
          title="This page does not exist"
          description="If you followed a link from your clinic, open it again from the message they sent you, or call the clinic to ask for a new one."
        />
      </LayoutContent>
    </PatientFrame>
  );
}
