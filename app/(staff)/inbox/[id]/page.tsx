import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {VStack} from '@astryxdesign/core/VStack';
import {getStaffConversation} from '@/lib/data/follow-ups';
import {Conversation} from './conversation';

// A follow-up from another clinic is not found, the same as one that does
// not exist.
async function FollowUpConversation({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const conversation = await getStaffConversation(id);
  if (!conversation) notFound();

  return <Conversation followUp={conversation.followUp} names={conversation.names} />;
}

function ConversationSkeleton() {
  return (
    <Layout
      content={
        <LayoutContent padding={4}>
          <VStack gap={3}>
            <Skeleton height={32} width={240} />
            <Skeleton height={64} index={1} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default function ConversationPage({params}: PageProps<'/inbox/[id]'>) {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <FollowUpConversation params={params} />
    </Suspense>
  );
}
