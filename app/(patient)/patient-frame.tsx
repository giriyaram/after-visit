import {Banner} from '@astryxdesign/core/Banner';
import {Heading} from '@astryxdesign/core/Heading';
import {Layout, LayoutHeader} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {VStack} from '@astryxdesign/core/VStack';
import type {ClinicView} from '@/lib/follow-up-view';

type Props = {
  /** Missing while the link is loading, or when it matches no follow-up. */
  clinic?: ClinicView;
  children: React.ReactNode;
};

// Every patient screen sits under the clinic name and the "Not for
// emergencies" banner (see docs/PRODUCT.md). The header stays in view while
// the content scrolls. Each page supplies its own LayoutContent, because the
// chat needs a different content region.
export function PatientFrame({clinic, children}: Props) {
  return (
    <Layout
      contentWidth={560}
      header={
        <LayoutHeader padding={0} hasDivider label="Clinic">
          <VStack gap={0}>
            <VStack padding={4}>
              <Heading level={1}>{clinic?.name ?? 'AfterVisit'}</Heading>
            </VStack>
            <Banner
              status="warning"
              container="section"
              title="Not for emergencies"
              description={
                clinic ? (
                  <>
                    In an emergency, call the clinic on{' '}
                    <Link
                      type="inherit"
                      href={`tel:${clinic.phone.replace(/\s/g, '')}`}>
                      {clinic.phone}
                    </Link>
                    .
                  </>
                ) : (
                  'In an emergency, call your clinic.'
                )
              }
            />
          </VStack>
        </LayoutHeader>
      }
      content={children}
    />
  );
}
