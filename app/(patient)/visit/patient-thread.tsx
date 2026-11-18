'use client';

import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutHeader} from '@astryxdesign/core/Layout';
import {Spinner} from '@astryxdesign/core/Spinner';
import {StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {NexconnChatUi, prepareChatUi} from '@/components/nexconn-chat-ui';
import {useChatSession, useFollowUpWindow} from '@/lib/chat/client';
import type {ClinicView, PatientFollowUpView} from '@/lib/follow-up-view';
import {extendFollowUp} from './[token]/actions';

type Props = {
  /** The link token from the URL. */
  token: string;
  clinic: ClinicView;
  followUp: PatientFollowUpView;
  /** Staff display names by chat user id. */
  staffNames: Record<string, string>;
};

const EXTEND_FAILED = 'Could not extend the follow-up. Check your connection and try again.';

// The patient's view of a follow-up: visit note pinned above the messages,
// Nexconn's Chat UI for the thread and the reply box, and the two next-step
// buttons once closed. Open or closed comes from the server; the chat
// session confirms it and the page is fetched again when it changes.
export function PatientThread({token, clinic, followUp, staffNames}: Props) {
  const router = useRouter();
  const linkPath = `/visit/${encodeURIComponent(token)}`;
  const chat = useChatSession(`${linkPath}/chat-session`, {beforeConnect: prepareChatUi});
  // Polled, and flipped on the end time, so a close by staff or the window
  // running out shows here without a reload. The patient is muted on the
  // Nexconn side by the same polling.
  const windowState = useFollowUpWindow(`${linkPath}/chat-state`, {
    isOpen: followUp.isOpen,
    isClosedEarly: followUp.isClosedEarly,
    endsAt: followUp.endsAt,
  });
  const isClosed = !windowState.isOpen;

  // A refused session means the phone digits must be confirmed again.
  useEffect(() => {
    if (chat.connection === 'unauthorized') router.replace(linkPath);
  }, [chat.connection, linkPath, router]);

  // ------------------------------------------------------------- extend
  const [isConfirmingExtend, setIsConfirmingExtend] = useState(false);
  const [isExtending, startExtending] = useTransition();
  const [extendError, setExtendError] = useState('');

  function handleExtend() {
    setExtendError('');
    startExtending(async () => {
      try {
        const result = await extendFollowUp(token);
        if (result.ok || result.reason === 'still_open') {
          // The same channel opens again with the reply box back.
          await windowState.refresh();
          router.refresh();
        } else if (result.reason === 'no_session') {
          router.replace(linkPath);
        } else if (result.reason === 'closed_by_clinic') {
          setExtendError('The clinic has closed this follow-up, so it cannot be extended.');
          router.refresh();
        } else {
          setExtendError(EXTEND_FAILED);
        }
      } catch {
        setExtendError(EXTEND_FAILED);
      }
      setIsConfirmingExtend(false);
    });
  }

  // Shown under the message list once the follow-up is closed.
  const closedControls = (
    <VStack gap={3} padding={4}>
      <Text type="supporting" justify="center">
        {windowState.isClosedEarly
          ? `${clinic.name} has closed this follow-up. You can still read your messages. To talk to the clinic, book a visit.`
          : 'You can read your messages, but you can no longer send new ones.'}
      </Text>
      {extendError && <Banner status="error" title={extendError} container="card" />}
      <HStack gap={2}>
        <StackItem size="fill">
          <Button
            label="Book a visit"
            variant="primary"
            width="100%"
            href={`tel:${clinic.phone.replace(/\s/g, '')}`}
          />
        </StackItem>
        {/* Staff's decision to close early cannot be undone by paying. */}
        {!windowState.isClosedEarly && (
          <StackItem size="fill">
            <Button
              label="Extend follow-up"
              width="100%"
              onClick={() => setIsConfirmingExtend(true)}
            />
          </StackItem>
        )}
      </HStack>
      <Text type="supporting" justify="center">
        Book a visit calls {clinic.name} on {clinic.phone}.
      </Text>
      <AlertDialog
        isOpen={isConfirmingExtend}
        onOpenChange={setIsConfirmingExtend}
        title="Extend for 7 more days?"
        description="This is a test payment, so no money is taken. You will be able to message the clinic for 7 more days."
        actionLabel="Pay and extend"
        actionVariant="primary"
        isActionLoading={isExtending}
        onAction={handleExtend}
      />
    </VStack>
  );

  // ------------------------------------------------------------ content
  let content: React.ReactNode;
  if (chat.connection === 'connecting' || chat.connection === 'unauthorized' || !chat.session) {
    content =
      chat.connection === 'unavailable' || chat.connection === 'offline' ? (
        <HStack height="100%" hAlign="center" vAlign="center">
          <EmptyState
            headingLevel={2}
            title="Could not open the chat"
            description="Check your connection and try again. In an emergency, call the clinic."
            actions={<Button label="Try again" variant="primary" onClick={chat.retry} />}
          />
        </HStack>
      ) : (
        <HStack height="100%" hAlign="center" vAlign="center">
          <Spinner size="lg" label="Connecting to the clinic" />
        </HStack>
      );
  } else {
    content = (
      <HStack height="100%" hAlign="center">
        <VStack height="100%" width="100%" maxWidth={560}>
          <StackItem size="fill">
            <NexconnChatUi
              session={chat.session}
              names={staffNames}
              channelName={clinic.name}
              isReadOnly={isClosed}
            />
          </StackItem>
          {isClosed && closedControls}
        </VStack>
      </HStack>
    );
  }

  const statusLine = isClosed
    ? windowState.isClosedEarly
      ? 'The clinic has closed this follow-up.'
      : 'This follow-up has ended.'
    : `${windowState.remainingLabel} to message the clinic.`;

  // A nested Layout keeps the visit note pinned in its own header while the
  // chat fills the rest of the screen and scrolls on its own.
  return (
    <Layout
      contentWidth={560}
      header={
        <LayoutHeader padding={4} label="Visit note">
          <VStack gap={2}>
            <Card variant="muted" padding={3}>
              <VStack gap={0.5}>
                <Text type="label" color="secondary">
                  Visit note
                </Text>
                <Text>{followUp.visitNote}</Text>
              </VStack>
            </Card>
            <Text type="supporting">{statusLine}</Text>
            {chat.connection === 'reconnecting' && (
              <Banner
                status="warning"
                container="card"
                title="Reconnecting"
                description="Messages will send once the connection is back."
              />
            )}
            {chat.connection === 'offline' && chat.session && (
              <Banner
                status="error"
                container="card"
                title="Connection lost"
                description="New messages will not arrive until you reconnect."
                endContent={<Button label="Reconnect" size="sm" onClick={chat.retry} />}
              />
            )}
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent padding={0}>{content}</LayoutContent>}
    />
  );
}
