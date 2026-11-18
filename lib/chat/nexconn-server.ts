// The Platform Chat API calls the app makes, behind one interface so the
// lifecycle tests can pass a fake. Every request is signed with the App
// Secret, which only lives in the server's environment. Nothing here imports
// Next, so scripts and tests can use it too; lib/chat/server.ts builds the
// real instance from env for the app.
import {createHash, randomBytes, randomUUID} from 'node:crypto';

export type NexconnConfig = {
  appKey: string;
  appSecret: string;
  /** Hostnames without https://, primary first. */
  hosts: string[];
  /** Per-request timeout in ms. The docs recommend 5 seconds. */
  timeoutMs?: number;
};

export type CreateGroupInput = {
  channelId: string;
  name: string;
  owner: string;
  /** Up to 30; more go through joinGroup. */
  userIds?: string[];
};

export interface NexconnServer {
  /** Registers the user if needed and returns a connection token. */
  issueToken(userId: string, name: string): Promise<string>;
  /** Creates the group. Resolves even if the group already exists. */
  createGroup(input: CreateGroupInput): Promise<void>;
  /** Adds members. Already-present members are fine. Any count. */
  joinGroup(channelId: string, userIds: string[]): Promise<void>;
  /** Permanently stops a member sending from the client SDK. */
  muteMember(channelId: string, userId: string): Promise<void>;
  unmuteMember(channelId: string, userId: string): Promise<void>;
  /**
   * Every token the user obtained before `beforeMs` stops working for new
   * connections and reconnects. Live connections are not dropped by this.
   */
  expireTokens(userId: string, beforeMs: number): Promise<void>;
  /** Drops the user's live connections now: a ban, lifted straight away. */
  disconnectUser(userId: string): Promise<void>;
  /** Stops the user sending in any direct channel from the client SDK. Repeats are fine. */
  muteInDirectChannels(userId: string): Promise<void>;
}

export class NexconnError extends Error {
  constructor(
    public readonly path: string,
    public readonly status: number,
    public readonly code: number | undefined,
  ) {
    super(`Nexconn ${path} failed: HTTP ${status}, code ${code ?? 'none'}`);
  }
}

/** Business code for "Group channel ID already exists" (seen as HTTP 400). */
const GROUP_EXISTS = 25409;

const CREATE_MAX = 30;
const JOIN_MAX = 100;
const DEFAULT_TIMEOUT_MS = 5000;

type ApiResponse = {code?: number; result?: unknown};

export function createNexconnServer(config: NexconnConfig): NexconnServer {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Failover sticks: once the backup answered, keep using it.
  let hostIndex = 0;

  const headers = () => {
    const nonce = randomBytes(8).toString('hex'); // 16 chars, limit is 18
    const timestamp = String(Date.now());
    const signature = createHash('sha1')
      .update(config.appSecret + nonce + timestamp)
      .digest('hex');
    return {
      'App-Key': config.appKey,
      Nonce: nonce,
      Timestamp: timestamp,
      Signature: signature,
      'X-Request-ID': randomUUID().replace(/-/g, ''),
      'Content-Type': 'application/json',
    };
  };

  async function post(path: string, body: unknown): Promise<ApiResponse & {status: number}> {
    const attempts = config.hosts.length;
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      const host = config.hosts[(hostIndex + i) % config.hosts.length];
      try {
        const response = await fetch(`https://${host}${path}`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        // Only timeouts and 5xx justify trying the other host. A 4xx is an
        // answer, and the business code says what went wrong.
        if (response.status >= 500) {
          lastError = new NexconnError(path, response.status, undefined);
          continue;
        }
        hostIndex = (hostIndex + i) % config.hosts.length;
        const json = (await response.json().catch(() => ({}))) as ApiResponse;
        return {...json, status: response.status};
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Nexconn ${path} unreachable`);
  }

  async function call(path: string, body: unknown, okCodes: number[] = []) {
    const response = await post(path, body);
    if (response.code === 0 || (response.code !== undefined && okCodes.includes(response.code))) {
      return response;
    }
    throw new NexconnError(path, response.status, response.code);
  }

  const chunk = <T>(items: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
  };

  return {
    async issueToken(userId, name) {
      const response = await call('/v4/auth/access-token/issue', {userId, name});
      const token = (response.result as {accessToken?: unknown} | undefined)?.accessToken;
      if (typeof token !== 'string' || !token) {
        throw new NexconnError('/v4/auth/access-token/issue', response.status, response.code);
      }
      return token;
    },

    async createGroup({channelId, name, owner, userIds = []}) {
      const [first = [], ...rest] = chunk(userIds, CREATE_MAX);
      await call(
        '/v4/group-channel/create',
        {
          channelId,
          name,
          owner,
          userIds: first,
          // Nobody joins from the client; our server adds members.
          permissions: {joinPerm: 3},
        },
        [GROUP_EXISTS],
      );
      if (rest.length) await this.joinGroup(channelId, rest.flat());
    },

    async joinGroup(channelId, userIds) {
      for (const batch of chunk(userIds, JOIN_MAX)) {
        await call('/v4/group-channel/join', {channelId, userIds: batch});
      }
    },

    async muteMember(channelId, userId) {
      await call('/v4/group-channel/user/mute-list/add', {
        channelId,
        userIds: [userId],
        durationMinutes: 0,
      });
    },

    async unmuteMember(channelId, userId) {
      await call('/v4/group-channel/user/mute-list/remove', {channelId, userIds: [userId]});
    },

    async expireTokens(userId, beforeMs) {
      await call('/v4/auth/access-token/expire', {userIds: [userId], expiresAt: beforeMs});
    },

    async disconnectUser(userId) {
      // A ban ends the connection at once. The shortest ban is a minute; it
      // is lifted right after, and if that fails it lifts itself.
      await call('/v4/user/ban', {userIds: [userId], durationMinutes: 1});
      await call('/v4/user/unban', {userIds: [userId]});
    },

    async muteInDirectChannels(userId) {
      await call('/v4/channel-type/mute/set', {
        userIds: [userId],
        muteState: 1,
        channelTypes: ['PERSON'],
      });
    },
  };
}
