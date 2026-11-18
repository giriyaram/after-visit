'use client';

import {useEffect, useState, useSyncExternalStore, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Flag} from 'lucide-react';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading} from '@astryxdesign/core/Heading';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Layout, LayoutContent, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {Link} from '@astryxdesign/core/Link';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Spinner} from '@astryxdesign/core/Spinner';
import {StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {NexconnChatUi, prepareChatUi} from '@/components/nexconn-chat-ui';
import {closeEarly, setFlagForDoctor} from '@/lib/actions/follow-ups';
import {useChatSession, useFollowUpWindow} from '@/lib/chat/client';
import type {FollowUpView} from '@/lib/follow-up-view';

type Props = {
  followUp: FollowUpView;
  /** Display names by chat user id: the patient and every staff member. */
  names: Record<string, string>;
};

const ACTION_FAILED = 'That did not go through. Check your connection and try again.';

const END_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * The end time in the viewer's own time zone. Formatted after mount, because
 * the server renders in its own zone and the two would not match.
 */
const subscribeNever = () => () => {};

function useLocalEndTime(endsAt: string): string | undefined {
  return useSyncExternalStore(
    subscribeNever,
    () => new Date(endsAt).toLocaleString(undefined, END_TIME_FORMAT),
    () => undefined,
  );
}

// One follow-up for staff: the patient's name and days left, the visit note
// pinned, Flag for doctor and Close early, and Nexconn's Chat UI for the
// thread and the reply box. Flag and close are server actions; the page is
// fetched again afterwards so what it shows is what the database holds.
export function Conversation({followUp, names}: Props) {
  const router = useRouter();
  const chat = useChatSession(`/inbox/${followUp.id}/chat-session`, {beforeConnect: prepareChatUi});
  // Polled and flipped on the end time, so the window ending shows here
  // without a reload. History stays readable either way.
  const windowState = useFollowUpWindow(`/inbox/${followUp.id}/chat-state`, {
    isOpen: followUp.isOpen,
    isClosedEarly: followUp.isClosedEarly,
    endsAt: followUp.endsAt,
  });
  const isClosed = !windowState.isOpen;
  // A follow-up that ran out its window is closed without being closed early.
  const hasEnded = isClosed && !windowState.isClosedEarly;
  const statusLabel = hasEnded ? 'Ended' : isClosed ? 'Closed early' : windowState.remainingLabel;
  const endTime = useLocalEndTime(followUp.endsAt);

  const [isFlagPending, startFlag] = useTransition();
  const [isClosePending, startClose] = useTransition();
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [actionError, setActionError] = useState('');

  function handleFlag() {
    setActionError('');
    startFlag(async () => {
      try {
        const result = await setFlagForDoctor(followUp.id, !followUp.isFlaggedForDoctor);
        if (!result.ok && result.reason === 'closed') {
          setActionError('This follow-up is closed, so the flag cannot change.');
        } else if (!result.ok) {
          setActionError(ACTION_FAILED);
        }
      } catch {
        setActionError(ACTION_FAILED);
      }
      router.refresh();
    });
  }

  function handleClose() {
    setActionError('');
    startClose(async () => {
      try {
        const result = await closeEarly(followUp.id);
        if (!result.ok && result.reason === 'closed') {
          setActionError('This follow-up was already closed.');
        } else if (!result.ok) {
          setActionError(ACTION_FAILED);
        }
      } catch {
        setActionError(ACTION_FAILED);
      }
      setIsConfirmingClose(false);
      await windowState.refresh();
      router.refresh();
    });
  }

  // A refused session means the staff session has ended.
  useEffect(() => {
    if (chat.connection === 'unauthorized') router.replace('/sign-in');
  }, [chat.connection, router]);

  let content: React.ReactNode;
  if (chat.connection === 'unavailable' || (chat.connection === 'offline' && !chat.session)) {
    content = (
      <HStack height="100%" hAlign="center" vAlign="center">
        <EmptyState
          headingLevel={2}
          title="Could not open the conversation"
          description="The chat service could not be reached."
          actions={<Button label="Try again" variant="primary" onClick={chat.retry} />}
        />
      </HStack>
    );
  } else if (!chat.session) {
    content = (
      <HStack height="100%" hAlign="center" vAlign="center">
        <Spinner size="lg" label="Opening the conversation" />
      </HStack>
    );
  } else {
    content = (
      <VStack height="100%">
        <StackItem size="fill">
          <NexconnChatUi
            session={chat.session}
            names={names}
            channelName={followUp.patientName}
            isReadOnly={isClosed}
          />
        </StackItem>
        {isClosed && (
          <VStack padding={3}>
            <Text type="supporting" justify="center">
              {hasEnded
                ? 'This follow-up has ended. The patient can no longer reply.'
                : 'This follow-up was closed early. The patient can no longer reply.'}
            </Text>
          </VStack>
        )}
      </VStack>
    );
  }

  return (
    <Layout
      header={
        <LayoutHeader padding={4} hasDivider label="Follow-up details">
          <VStack gap={3}>
            <Link href="/inbox" type="supporting">
              Back to inbox
            </Link>
            <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
              <HStack gap={3} vAlign="center">
                <Avatar name={followUp.patientName} size="lg" tooltip={false} />
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Heading level={1}>{followUp.patientName}</Heading>
                    {followUp.isFlaggedForDoctor && (
                      <Token
                        label="Flagged for doctor"
                        size="sm"
                        color="orange"
                        icon={<Icon icon={Flag} size="xsm" />}
                      />
                    )}
                  </HStack>
                  <Text type="supporting">
                    {statusLabel}
                    {' · '}
                    {followUp.doctor}
                  </Text>
                </VStack>
              </HStack>
              <HStack gap={2}>
                <Button
                  label={followUp.isFlaggedForDoctor ? 'Remove flag' : 'Flag for doctor'}
                  icon={<Icon icon={Flag} />}
                  isDisabled={isClosed}
                  isLoading={isFlagPending}
                  onClick={handleFlag}
                />
                <Button
                  label="Close early"
                  variant="destructive"
                  isDisabled={isClosed}
                  isLoading={isClosePending}
                  onClick={() => setIsConfirmingClose(true)}
                />
              </HStack>
            </HStack>
            <AlertDialog
              isOpen={isConfirmingClose}
              onOpenChange={setIsConfirmingClose}
              title="Close this follow-up early?"
              description={`${followUp.patientName} will be able to read the conversation but not send anything more, and will not be able to extend it.`}
              actionLabel="Close early"
              isActionLoading={isClosePending}
              onAction={handleClose}
            />
            {actionError && <Banner status="error" container="card" title={actionError} />}
            {chat.connection === 'reconnecting' && (
              <Banner status="warning" container="card" title="Reconnecting to chat" />
            )}
            {chat.connection === 'offline' && chat.session && (
              <Banner
                status="error"
                container="card"
                title="Chat connection lost"
                endContent={<Button label="Reconnect" size="sm" onClick={chat.retry} />}
              />
            )}
            <Card variant="muted" padding={3}>
              <VStack gap={0.5}>
                <Text type="label" color="secondary">
                  Visit note
                </Text>
                <Text>{followUp.visitNote}</Text>
              </VStack>
            </Card>
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent padding={0}>{content}</LayoutContent>}
      end={
        <LayoutPanel width={300} padding={4} hasDivider label="Follow-up details">
          <VStack gap={5}>
            <MetadataList title={<Text type="label">Details</Text>} label={{position: 'top'}}>
              <MetadataListItem label="Status">
                <Token
                  label={isClosed ? statusLabel : 'Open'}
                  size="sm"
                  color={isClosed ? 'gray' : 'teal'}
                />
              </MetadataListItem>
              <MetadataListItem label={isClosed ? 'Ended on' : 'Ends on'}>
                {endTime ?? <Skeleton width={160} height={20} />}
              </MetadataListItem>
              {!isClosed && (
                <MetadataListItem label="Time left">{windowState.remainingLabel}</MetadataListItem>
              )}
              <MetadataListItem label="Assigned doctor">{followUp.doctor}</MetadataListItem>
              <MetadataListItem label="Flagged for doctor">
                {followUp.isFlaggedForDoctor ? 'Yes' : 'No'}
              </MetadataListItem>
            </MetadataList>
            <Card padding={3}>
              <VStack gap={1}>
                <Text type="label">What the patient sees</Text>
                <Text type="supporting">
                  The visit note, the clinic name and phone, and a reminder that this chat
                  is not for emergencies.
                  {isClosed
                    ? ' The chat is read-only for them now.'
                    : ' Closing early makes the chat read-only for them, and it cannot be extended.'}
                </Text>
              </VStack>
            </Card>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}
