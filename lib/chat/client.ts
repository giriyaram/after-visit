'use client';

// The browser side of a follow-up's chat: asks our server for a session
// (token, user id, channel id), initializes the Nexconn Chat SDK once per
// tab, connects, and reports the connection state. The message list and
// composer are Nexconn's Chat UI (components/nexconn-chat-ui.tsx).
//
// Names were checked against node_modules/@nexconn/chat/index.d.ts (26.2.1).
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {
  AreaCode,
  BaseChannel,
  ConnectionStatus,
  ConnectionStatusHandler,
  LogLevel,
  MessageHandler,
  MessageType,
  NCEngine,
  type Message,
  type TextMessageContent,
} from '@nexconn/chat';

export type ChatSession = {
  token: string;
  userId: string;
  channelId: string;
  isOpen: boolean;
  endsAt: string;
};

type SessionResponse = ({ok: true} & ChatSession) | {ok: false; reason: string};

/** The inbox session: a token and user id, no particular channel. */
type InboxSessionResponse = {ok: true; token: string; userId: string} | {ok: false; reason: string};

/**
 * `connecting`: first connection, nothing to show yet.
 * `connected`: live.
 * `reconnecting`: the SDK lost the socket and is retrying by itself.
 * `offline`: the SDK gave up; `retry()` starts again.
 * `unauthorized`: our server refused a session; the caller sends the user away.
 * `unavailable`: our server or Nexconn failed; `retry()` tries again.
 */
export type ChatConnection =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'unauthorized'
  | 'unavailable';

// One SDK per tab. initialize() may run once; connect() once per user.
let isInitialized = false;
let connectedUserId: string | null = null;
let connecting: Promise<boolean> | null = null;

function areaCode() {
  const code = process.env.NEXT_PUBLIC_NEXCONN_AREA_CODE as keyof typeof AreaCode | undefined;
  return code && code in AreaCode ? AreaCode[code] : AreaCode.SG;
}

/** Initializes the Chat SDK once. Must run before Chat UI is created. */
export function initializeEngine() {
  if (isInitialized) return;
  const appKey = process.env.NEXT_PUBLIC_NEXCONN_APP_KEY;
  if (!appKey) throw new Error('NEXT_PUBLIC_NEXCONN_APP_KEY is not set.');
  NCEngine.initialize({
    appKey,
    areaCode: areaCode(),
    logLevel: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.INFO,
  });
  isInitialized = true;
}

/** The user the SDK is connected as, if any. */
export function connectedUser() {
  return connectedUserId;
}

/** Drops the connection so the next connectAs() starts clean. */
export async function disconnectEngine() {
  if (!connectedUserId) return;
  await NCEngine.disconnect();
  connectedUserId = null;
}

/** Connects as this user, switching users if another one was connected. */
export function connectAs(token: string, userId: string): Promise<boolean> {
  if (connectedUserId === userId && NCEngine.getConnectionStatus() === ConnectionStatus.CONNECTED) {
    return Promise.resolve(true);
  }
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      if (connectedUserId && connectedUserId !== userId) await NCEngine.disconnect();
      const result = await NCEngine.connect({token});
      connectedUserId = result.isOk ? userId : null;
      return result.isOk;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

/** Asks our server for a session. Never throws. */
export async function fetchSession(sessionPath: string): Promise<SessionResponse | 'network'> {
  try {
    const response = await fetch(sessionPath, {method: 'POST', cache: 'no-store'});
    return (await response.json()) as SessionResponse;
  } catch {
    return 'network';
  }
}

export type ChatSessionState = {
  connection: ChatConnection;
  session: ChatSession | null;
  /** Starts over: new session, new connection. */
  retry: () => void;
};

type SessionOptions = {
  /**
   * Runs after the SDK is initialized and before it connects. Chat UI must
   * be created here, since it only learns the connection state from events.
   */
  beforeConnect?: () => void;
};

/**
 * Gets a session from `sessionPath` (our endpoint, e.g.
 * /visit/<token>/chat-session), connects the SDK, and tracks the connection.
 */
export function useChatSession(sessionPath: string, options: SessionOptions = {}): ChatSessionState {
  const beforeConnectRef = useRef(options.beforeConnect);
  useEffect(() => {
    beforeConnectRef.current = options.beforeConnect;
  }, [options.beforeConnect]);
  const handlerId = useId();
  const [connection, setConnection] = useState<ChatConnection>('connecting');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const connectionHandler = new ConnectionStatusHandler({
      onConnectionStatusChanged({status}) {
        if (isCancelled) return;
        if (status === ConnectionStatus.CONNECTED) setConnection('connected');
        else if (status === ConnectionStatus.DISCONNECTED) setConnection('offline');
        else setConnection(current => (current === 'connecting' ? current : 'reconnecting'));
      },
    });

    (async () => {
      let response: SessionResponse | 'network';
      try {
        initializeEngine();
        beforeConnectRef.current?.();
        response = await fetchSession(sessionPath);
      } catch {
        response = 'network';
      }
      if (isCancelled) return;
      if (response === 'network') return setConnection('unavailable');
      if (!response.ok) return setConnection('unauthorized');

      const next: ChatSession = {
        token: response.token,
        userId: response.userId,
        channelId: response.channelId,
        isOpen: response.isOpen,
        endsAt: response.endsAt,
      };
      sessionRef.current = next;
      setSession(next);

      NCEngine.addConnectionStatusHandler(handlerId, connectionHandler);
      const isConnected = await connectAs(next.token, next.userId);
      if (isCancelled) return;
      setConnection(isConnected ? 'connected' : 'offline');
    })();

    return () => {
      isCancelled = true;
      NCEngine.removeConnectionStatusHandler(handlerId);
    };
  }, [sessionPath, handlerId, attempt]);

  const retry = useCallback(() => {
    setConnection('connecting');
    setSession(null);
    setAttempt(n => n + 1);
  }, []);

  return {connection, session, retry};
}

// ------------------------------------------------------------- inbox

/** What the inbox shows for one conversation, from Nexconn. */
export type ChannelSummary = {
  unreadCount: number;
  /** One line for the latest message, or undefined when there is none. */
  preview?: string;
  previewFromUserId?: string;
};

export type StaffUnreadState = {
  connection: ChatConnection;
  /** Summaries by channel id. Empty until the first load finishes. */
  summaries: Record<string, ChannelSummary>;
  isLoaded: boolean;
  retry: () => void;
};

const CHANNEL_PAGE_SIZE = 100;
const RELOAD_DEBOUNCE_MS = 400;

function previewOf(message: Message | null): Pick<ChannelSummary, 'preview' | 'previewFromUserId'> {
  if (!message) return {};
  const previewFromUserId = message.senderUserId;
  if (message.messageType === MessageType.TEXT) {
    return {preview: (message.content as TextMessageContent).text, previewFromUserId};
  }
  if (message.messageType === MessageType.IMAGE) return {preview: 'Photo', previewFromUserId};
  return {preview: 'Message', previewFromUserId};
}

/** Every channel the user is in, with unread counts and latest messages. */
async function loadSummaries(): Promise<Record<string, ChannelSummary> | undefined> {
  const summaries: Record<string, ChannelSummary> = {};
  const query = BaseChannel.createChannelsQuery({pageSize: CHANNEL_PAGE_SIZE});
  // Web keeps nothing locally, so every page comes from the server. The
  // list ends when a page comes back short.
  for (;;) {
    const page = await query.loadNextPage();
    const data = page.data;
    if (!page.isOk || !data) return undefined;
    for (const channel of data.data) {
      summaries[channel.channelId] = {
        unreadCount: channel.unreadCount,
        ...previewOf(channel.latestMessage),
      };
    }
    if (data.data.length < CHANNEL_PAGE_SIZE) return summaries;
  }
}

/**
 * Connects the signed-in staff member for the inbox and keeps a summary of
 * every conversation they are in: unread count and latest message. The
 * list is reloaded when a message arrives, so counts stay current.
 *
 * Pass Chat UI's `beforeConnect` here too: the connection outlives the page,
 * so a conversation opened from the inbox reuses it, and Chat UI created
 * after the connect never sees the sync finish and cannot open a channel.
 */
export function useStaffUnread(sessionPath: string, options: SessionOptions = {}): StaffUnreadState {
  const beforeConnectRef = useRef(options.beforeConnect);
  useEffect(() => {
    beforeConnectRef.current = options.beforeConnect;
  }, [options.beforeConnect]);
  const handlerId = useId();
  const [connection, setConnection] = useState<ChatConnection>('connecting');
  const [summaries, setSummaries] = useState<Record<string, ChannelSummary>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;

    const reload = async () => {
      const next = await loadSummaries();
      if (isCancelled || !next) return;
      setSummaries(next);
      setIsLoaded(true);
    };
    const scheduleReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => void reload(), RELOAD_DEBOUNCE_MS);
    };

    const connectionHandler = new ConnectionStatusHandler({
      onConnectionStatusChanged({status}) {
        if (isCancelled) return;
        if (status === ConnectionStatus.CONNECTED) setConnection('connected');
        else if (status === ConnectionStatus.DISCONNECTED) setConnection('offline');
        else setConnection(current => (current === 'connecting' ? current : 'reconnecting'));
      },
    });
    const messageHandler = new MessageHandler({
      onMessageReceived() {
        if (!isCancelled) scheduleReload();
      },
      onOfflineMessageSyncCompleted() {
        if (!isCancelled) scheduleReload();
      },
    });

    (async () => {
      let response: InboxSessionResponse | 'network';
      try {
        initializeEngine();
        beforeConnectRef.current?.();
        const raw = await fetch(sessionPath, {method: 'POST', cache: 'no-store'});
        response = (await raw.json()) as InboxSessionResponse;
      } catch {
        response = 'network';
      }
      if (isCancelled) return;
      if (response === 'network') return setConnection('unavailable');
      if (!response.ok) return setConnection('unauthorized');

      NCEngine.addConnectionStatusHandler(handlerId, connectionHandler);
      NCEngine.addMessageHandler(handlerId, messageHandler);
      const isConnected = await connectAs(response.token, response.userId);
      if (isCancelled) return;
      if (!isConnected) return setConnection('offline');
      setConnection('connected');
      await reload();
    })();

    return () => {
      isCancelled = true;
      clearTimeout(reloadTimer);
      NCEngine.removeConnectionStatusHandler(handlerId);
      NCEngine.removeMessageHandler(handlerId);
    };
  }, [sessionPath, handlerId, attempt]);

  const retry = useCallback(() => {
    setConnection('connecting');
    setAttempt(n => n + 1);
  }, []);

  return {connection, summaries, isLoaded, retry};
}

// ------------------------------------------------------ window state

/** Where the window stands, as the state endpoint reports it. */
export type WindowState = {
  isOpen: boolean;
  isClosedEarly: boolean;
  endsAt: string;
};

type StateResponse = ({ok: true; serverNow: string} & WindowState) | {ok: false; reason: string};

export type FollowUpWindow = WindowState & {
  /** "3 days left", "12 minutes left", or "Ended". From the server's clock. */
  remainingLabel: string;
  /** Asks the server again now, for example after an extension. */
  refresh: () => Promise<void>;
};

const POLL_MS = 15_000;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function remainingLabel(state: WindowState, now: number) {
  if (!state.isOpen) return 'Ended';
  const msLeft = new Date(state.endsAt).getTime() - now;
  if (msLeft <= 0) return 'Ended';
  if (msLeft < 60 * MINUTE) {
    const minutes = Math.max(1, Math.ceil(msLeft / MINUTE));
    return minutes === 1 ? '1 minute left' : `${minutes} minutes left`;
  }
  const days = Math.ceil(msLeft / DAY);
  return days === 1 ? '1 day left' : `${days} days left`;
}

/**
 * Keeps a follow-up's window state current without a page reload: polls
 * `statePath`, asks again when the tab comes back into view, and flips to
 * closed on its own the moment the end time passes. The end time is judged
 * on the server's clock, carried as an offset from the last answer.
 */
export function useFollowUpWindow(statePath: string, initial: WindowState): FollowUpWindow {
  const [state, setState] = useState<WindowState>(initial);
  // Server time minus browser time, so a wrong device clock does no harm.
  const [offset, setOffset] = useState(0);
  // The browser clock as of the last tick; the label is derived from it.
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(statePath, {cache: 'no-store'});
      const body = (await response.json()) as StateResponse;
      if (!body.ok) return;
      const current = Date.now();
      setNow(current);
      setOffset(new Date(body.serverNow).getTime() - current);
      setState({isOpen: body.isOpen, isClosedEarly: body.isClosedEarly, endsAt: body.endsAt});
    } catch {
      // Keep what we have; the next poll tries again.
    }
  }, [statePath]);

  // Poll, and ask again when the tab is shown.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // Tick once a minute for the label, and at the end time flip to closed,
  // then confirm with the server, which is also what mutes the patient.
  useEffect(() => {
    if (!state.isOpen) return;
    const endsAt = new Date(state.endsAt).getTime();
    const msLeft = endsAt - (now + offset);
    const timer = setTimeout(
      () => {
        const current = Date.now();
        setNow(current);
        if (endsAt - (current + offset) <= 0) {
          setState(previous => (previous.isOpen ? {...previous, isOpen: false} : previous));
          void refresh();
        }
      },
      Math.max(0, Math.min(msLeft, MINUTE)),
    );
    return () => clearTimeout(timer);
  }, [state, now, offset, refresh]);

  return {...state, remainingLabel: remainingLabel(state, now + offset), refresh};
}
