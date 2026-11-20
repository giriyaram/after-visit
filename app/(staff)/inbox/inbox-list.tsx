'use client';

import {useMemo} from 'react';
import {CheckCheck, Flag, Hourglass, MessageSquarePlus, MessagesSquare} from 'lucide-react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon, type IconType} from '@astryxdesign/core/Icon';
import {List, ListItem} from '@astryxdesign/core/List';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/VStack';
import {channelIdFor, isPatientChatId} from '@/lib/chat/ids';
import {useStaffUnread, type ChannelSummary} from '@/lib/chat/client';
import {daysRemainingLabel, type FollowUpView} from '@/lib/follow-up-view';
import {InboxFilter} from './inbox-filter';

type Props = {
  /** Every open follow-up from the server, the ones ending soonest first. */
  followUps: FollowUpView[];
  /** Show only the ones flagged for the doctor in the list. */
  isFilteredToFlagged: boolean;
};

/** Here, not in the page, because a server page cannot hand an icon component to the client. */
export function NewFollowUpButton() {
  return (
    <Button
      label="New follow-up"
      variant="primary"
      href="/follow-ups/new"
      icon={<Icon icon={MessageSquarePlus} />}
    />
  );
}

/**
 * Creates Chat UI before the inbox connects, so a conversation opened from
 * here can reuse the connection. Imported on demand: Chat UI defines Web
 * Components when it loads, which fails on the server where /inbox is
 * prerendered.
 */
async function prepareChatUiInBrowser() {
  const {prepareChatUi} = await import('@/components/nexconn-chat-ui');
  prepareChatUi();
}

function previewLine(summary: ChannelSummary | undefined) {
  if (!summary?.preview) return 'No messages yet';
  const isFromPatient = summary.previewFromUserId ? isPatientChatId(summary.previewFromUserId) : false;
  return isFromPatient ? summary.preview : `Clinic: ${summary.preview}`;
}

/** Orange on the last day, so the ones about to close stand out. */
function DaysLeft({days}: {days: number}) {
  return (
    <Token
      label={daysRemainingLabel(days)}
      size="sm"
      color={days <= 1 ? 'orange' : 'default'}
      icon={<Icon icon="clock" size="xsm" />}
    />
  );
}

type TileProps = {
  label: string;
  /** Undefined while it is still loading. */
  value: number | undefined;
  icon: IconType;
  /** Shown instead of the number when it cannot be known. */
  unavailableText?: string;
};

function SummaryTile({label, value, icon, unavailableText}: TileProps) {
  return (
    <Card padding={4}>
      <HStack gap={3} hAlign="between" vAlign="start">
        <VStack gap={1}>
          <Text type="supporting">{label}</Text>
          {unavailableText ? (
            <Text type="body" color="secondary">
              {unavailableText}
            </Text>
          ) : value === undefined ? (
            <Skeleton width={40} height={32} />
          ) : (
            <Text type="display-3">{value}</Text>
          )}
        </VStack>
        <Icon icon={icon} color="accent" />
      </HStack>
    </Card>
  );
}

// The rows come from the database; unread counts and the latest message come
// from Nexconn once the staff member's chat identity connects. Until then the
// rows show in time-remaining order with a placeholder where the count goes.
export function InboxList({followUps, isFilteredToFlagged}: Props) {
  const unread = useStaffUnread('/inbox/chat-session', {beforeConnect: prepareChatUiInBrowser});
  const isUnreadUnavailable =
    unread.connection === 'offline' || unread.connection === 'unavailable';

  const rows = useMemo(() => {
    const withSummary = followUps.map(followUp => ({
      followUp,
      summary: unread.summaries[channelIdFor(followUp.id)],
    }));
    if (!unread.isLoaded) return withSummary;
    // Unread first; within each group the server's order (ending soonest)
    // holds, since sort is stable.
    return [...withSummary].sort(
      (a, b) => Number((b.summary?.unreadCount ?? 0) > 0) - Number((a.summary?.unreadCount ?? 0) > 0),
    );
  }, [followUps, unread.summaries, unread.isLoaded]);

  const visibleRows = isFilteredToFlagged
    ? rows.filter(row => row.followUp.isFlaggedForDoctor)
    : rows;
  const flaggedCount = followUps.filter(followUp => followUp.isFlaggedForDoctor).length;
  const endingSoonCount = followUps.filter(followUp => followUp.daysRemaining <= 1).length;
  const unreadCount = unread.isLoaded
    ? rows.filter(row => (row.summary?.unreadCount ?? 0) > 0).length
    : undefined;

  if (followUps.length === 0) {
    return (
      <Card padding={8}>
        <EmptyState
          title="No open follow-ups"
          description="Follow-ups appear here once reception opens one for a patient."
          headingLevel={2}
          icon={<Icon icon={MessagesSquare} size="lg" color="accent" />}
          actions={<NewFollowUpButton />}
        />
      </Card>
    );
  }

  return (
    <VStack gap={5}>
      <Grid columns={{minWidth: 180, max: 4}} gap={3}>
        <SummaryTile label="Open follow-ups" value={followUps.length} icon={MessagesSquare} />
        <SummaryTile
          label="With unread messages"
          value={unreadCount}
          icon={CheckCheck}
          unavailableText={isUnreadUnavailable ? 'Unavailable' : undefined}
        />
        <SummaryTile label="Flagged for doctor" value={flaggedCount} icon={Flag} />
        <SummaryTile label="Ending within a day" value={endingSoonCount} icon={Hourglass} />
      </Grid>

      {isUnreadUnavailable && (
        <Banner
          status="warning"
          container="card"
          title="Unread counts are unavailable"
          description="The chat service could not be reached, so the list is in time-remaining order only."
          endContent={<Button label="Try again" size="sm" onClick={unread.retry} />}
        />
      )}

      <Card padding={4}>
        <VStack gap={3}>
          <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
            <Text type="label">
              {isFilteredToFlagged ? 'Flagged for doctor' : 'All open conversations'}
            </Text>
            <InboxFilter value={isFilteredToFlagged ? 'flagged' : 'all'} />
          </HStack>

          {visibleRows.length === 0 ? (
            <EmptyState
              title="Nothing flagged for the doctor"
              description="Reception flags a conversation when it needs the doctor's answer."
              headingLevel={2}
              icon={<Icon icon={Flag} size="lg" color="accent" />}
              actions={<Button label="Show all open" href="/inbox" />}
            />
          ) : (
            <List hasDividers edge="outset">
              {visibleRows.map(({followUp, summary}) => {
                const count = summary?.unreadCount ?? 0;
                const isUnread = count > 0;
                return (
                  <ListItem
                    key={followUp.id}
                    href={`/inbox/${followUp.id}`}
                    startContent={<Avatar name={followUp.patientName} tooltip={false} />}
                    label={
                      <HStack gap={2} vAlign="center" wrap="wrap">
                        <Text weight={isUnread ? 'bold' : 'medium'}>{followUp.patientName}</Text>
                        <Text type="supporting">{followUp.doctor}</Text>
                        {followUp.isFlaggedForDoctor && (
                          <Token
                            label="Flagged for doctor"
                            size="sm"
                            color="orange"
                            icon={<Icon icon={Flag} size="xsm" />}
                          />
                        )}
                      </HStack>
                    }
                    description={unread.isLoaded ? previewLine(summary) : followUp.visitNote}
                    endContent={
                      <HStack gap={3} vAlign="center">
                        {!unread.isLoaded && !isUnreadUnavailable && (
                          <Skeleton width={28} height={20} />
                        )}
                        {isUnread && <Badge variant="teal" label={count} />}
                        <DaysLeft days={followUp.daysRemaining} />
                      </HStack>
                    }
                  />
                );
              })}
            </List>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
