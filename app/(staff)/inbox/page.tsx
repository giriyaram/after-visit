import {Suspense} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {listOpenFollowUps} from '@/lib/data/follow-ups';
import {InboxList, NewFollowUpButton} from './inbox-list';

type SearchParams = Promise<{flagged?: string | string[]}>;

// listOpenFollowUps checks the session and returns only the signed-in staff
// member's clinic. All open follow-ups are loaded so the summary counts cover
// the whole inbox; the flag filter is a query parameter, so it survives a
// reload and the back button, and is applied to the list only.
async function OpenFollowUps({searchParams}: {searchParams: SearchParams}) {
  const {flagged} = await searchParams;
  const followUps = await listOpenFollowUps();
  return <InboxList followUps={followUps} isFilteredToFlagged={flagged === '1'} />;
}

function InboxSkeleton() {
  return (
    <VStack gap={5}>
      <Grid columns={{minWidth: 180, max: 4}} gap={3}>
        {[0, 1, 2, 3].map(index => (
          <Skeleton key={index} height={96} index={index} />
        ))}
      </Grid>
      <Card padding={4}>
        <VStack gap={3}>
          {[0, 1, 2, 3].map(index => (
            <Skeleton key={index} height={56} index={index} />
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}

export default function InboxPage({searchParams}: {searchParams: SearchParams}) {
  return (
    <Layout
      content={
        <LayoutContent padding={6}>
          <VStack gap={5} maxWidth={1040}>
            <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
              <VStack gap={1}>
                <Heading level={1}>Inbox</Heading>
                <Text type="supporting">
                  Open follow-ups for your clinic. Unread first, then the ones
                  ending soonest.
                </Text>
              </VStack>
              <NewFollowUpButton />
            </HStack>
            <Suspense fallback={<InboxSkeleton />}>
              <OpenFollowUps searchParams={searchParams} />
            </Suspense>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
