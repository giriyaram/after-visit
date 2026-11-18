import {EmptyState} from '@astryxdesign/core/EmptyState';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {VStack} from '@astryxdesign/core/VStack';
import {PatientFrame} from '../patient-frame';

/** Shown when a link's token matches no follow-up. */
export function InvalidLink() {
  return (
    <PatientFrame>
      <LayoutContent padding={4}>
        <EmptyState
          headingLevel={2}
          title="This link is not working"
          description="It may have expired or been copied incorrectly. Call your clinic to ask for a new link."
        />
      </LayoutContent>
    </PatientFrame>
  );
}

/** Shown while the link is being looked up. */
export function VisitLoading() {
  return (
    <PatientFrame>
      <LayoutContent padding={4}>
        <VStack gap={3}>
          <Skeleton height={32} width={200} />
          <Skeleton height={96} index={1} />
        </VStack>
      </LayoutContent>
    </PatientFrame>
  );
}
