'use client';

// Nexconn's prebuilt Chat UI for one channel, inside our own page. It
// renders only the channel detail region (message list and input), or the
// message list alone when the viewer may read but not send. The outer
// layout, the pinned note and the closed-state controls stay Astryx.
//
// Names were checked against node_modules/@nexconn/chatui/dist/index.d.ts
// (26.2.5). Chat UI is Web Components; the tags below are the ones its docs
// say to mount directly.
import {useEffect, useState} from 'react';
import {GroupChannelIdentifier} from '@nexconn/chat';
import {InputMenumID, NCChatUIApplication, type ServiceHooks} from '@nexconn/chatui';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {HStack} from '@astryxdesign/core/HStack';
import {Spinner} from '@astryxdesign/core/Spinner';
import {connectAs, connectedUser, disconnectEngine, initializeEngine, type ChatSession} from '@/lib/chat/client';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'nc-channel-detail-provider': React.HTMLAttributes<HTMLElement>;
      'nc-message-list-provider': React.HTMLAttributes<HTMLElement>;
    }
  }
}

type Props = {
  session: ChatSession;
  /** Display names by chat user id. The viewer's own id is labelled "You". */
  names: Record<string, string>;
  /** Name shown for the channel and for unknown senders. */
  channelName: string;
  /** Message list only, no input. */
  isReadOnly: boolean;
};

/** Chat UI's code for "the channel list is still syncing, try again". */
const CHANNEL_LIST_NOT_READY = 39005;
const OPEN_RETRY_MS = 500;
const OPEN_RETRY_LIMIT = 20;

// One Chat UI per tab. The hooks read the latest names through this ref so
// a new follow-up or a renamed doctor does not need a new application.
type HookData = {names: Record<string, string>; channelName: string; viewerId: string};
const hookData: HookData = {names: {}, channelName: '', viewerId: ''};
let app: NCChatUIApplication | null = null;

/**
 * Chat UI follows one user from its creation. When the tab switches user
 * (sign out and in as someone else), it is torn down and built again before
 * the new connection, so it sees that connection come up.
 */
async function switchUserIfNeeded(userId: string) {
  const current = connectedUser();
  if (!app || !current || current === userId) return;
  await disconnectEngine();
  app.destroy();
  app = null;
}

/**
 * Creates Chat UI once per tab. Call it before the SDK connects, or Chat UI
 * never sees the connection and shows "Disconnected".
 */
export function prepareChatUi(): NCChatUIApplication {
  if (app) return app;
  initializeEngine();
  const hooks: ServiceHooks = {
    async reqUserProfiles(userIds) {
      return userIds.map(userId => ({
        userId,
        name: userId === hookData.viewerId ? 'You' : (hookData.names[userId] ?? hookData.channelName),
      }));
    },
    async reqGroupProfiles(groupIds) {
      return groupIds.map(groupId => ({
        groupId,
        name: hookData.channelName,
        memberCount: Object.keys(hookData.names).length + 1,
      }));
    },
    async reqGroupMembers() {
      return Object.entries(hookData.names).map(([userId, nickname]) => ({userId, nickname}));
    },
    async reqSystemProfiles(systemIds) {
      return systemIds.map(systemId => ({systemId, name: hookData.channelName}));
    },
  };
  const created = NCChatUIApplication.initialize({hooks, language: 'en_US'});
  if (!created) throw new Error('Chat UI could not be initialized.');
  // Our page owns the header, so Chat UI's back button has nowhere to go.
  created.setChannelDetailBackSwitch(false);
  // The spec allows text and photos. No file picker; emoji and the camera
  // stay, and the image picker covers photos.
  const menu = created.cloneInputMenu();
  menu.items = menu.items.filter(item => item.id !== InputMenumID.FILES);
  created.setInputMenu(menu);
  created.ready();
  app = created;
  return created;
}

export function NexconnChatUi({session, names, channelName, isReadOnly}: Props) {
  const [isOpened, setIsOpened] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // The hooks read these when Chat UI asks for a profile.
  useEffect(() => {
    hookData.names = names;
    hookData.channelName = channelName;
    hookData.viewerId = session.userId;
  }, [names, channelName, session.userId]);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      hookData.names = names;
      hookData.channelName = channelName;
      hookData.viewerId = session.userId;
      await switchUserIfNeeded(session.userId);
      if (isCancelled) return;
      const ui = prepareChatUi();
      const isConnected = await connectAs(session.token, session.userId);
      if (isCancelled) return;
      if (!isConnected) return setOpenError(true);

      // The channel list syncs right after connect; opening before that
      // answers 39005, so wait and try again.
      const identifier = new GroupChannelIdentifier(session.channelId);
      for (let i = 0; i < OPEN_RETRY_LIMIT; i++) {
        const result = await ui.openChannel(identifier, !isReadOnly);
        if (isCancelled) return;
        if (result.isOk) return setIsOpened(true);
        if (result.code !== CHANNEL_LIST_NOT_READY) break;
        await new Promise(resolve => setTimeout(resolve, OPEN_RETRY_MS));
      }
      setOpenError(true);
    })();
    return () => {
      isCancelled = true;
    };
  }, [session.token, session.userId, session.channelId, isReadOnly, attempt, names, channelName]);

  if (openError) {
    return (
      <HStack height="100%" hAlign="center" vAlign="center">
        <EmptyState
          headingLevel={2}
          title="Could not open the conversation"
          description="Check your connection and try again. In an emergency, call the clinic."
          actions={
            <Button
              label="Try again"
              variant="primary"
              onClick={() => {
                setOpenError(false);
                setAttempt(n => n + 1);
              }}
            />
          }
        />
      </HStack>
    );
  }
  if (!isOpened) {
    return (
      <HStack height="100%" hAlign="center" vAlign="center">
        <Spinner size="lg" label="Opening the conversation" />
      </HStack>
    );
  }
  // Chat UI sizes itself to its host, so the host must fill the column.
  return isReadOnly ? (
    <nc-message-list-provider style={{display: 'block', width: '100%', height: '100%'}} />
  ) : (
    <nc-channel-detail-provider style={{display: 'block', width: '100%', height: '100%'}} />
  );
}
