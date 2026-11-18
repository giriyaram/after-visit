// An in-memory NexconnServer for tests and scripts. Records every call.
import type {CreateGroupInput, NexconnServer} from './nexconn-server';

export type FakeCall =
  | {kind: 'issueToken'; userId: string; name: string}
  | {kind: 'createGroup'; input: CreateGroupInput}
  | {kind: 'joinGroup'; channelId: string; userIds: string[]}
  | {kind: 'muteMember'; channelId: string; userId: string}
  | {kind: 'unmuteMember'; channelId: string; userId: string}
  | {kind: 'expireTokens'; userId: string; beforeMs: number}
  | {kind: 'disconnectUser'; userId: string}
  | {kind: 'muteInDirectChannels'; userId: string};

export class FakeNexconnServer implements NexconnServer {
  calls: FakeCall[] = [];
  /** Members per channel, as Nexconn would hold them. */
  groups = new Map<string, Set<string>>();
  muted = new Map<string, Set<string>>();
  /** When set, every call throws this, like an outage. */
  failure: Error | undefined;

  private record(call: FakeCall) {
    if (this.failure) throw this.failure;
    this.calls.push(call);
  }

  of<K extends FakeCall['kind']>(kind: K) {
    return this.calls.filter((c): c is Extract<FakeCall, {kind: K}> => c.kind === kind);
  }

  async issueToken(userId: string, name: string) {
    this.record({kind: 'issueToken', userId, name});
    return `fake-token-for-${userId}`;
  }

  async createGroup(input: CreateGroupInput) {
    this.record({kind: 'createGroup', input});
    const members = this.groups.get(input.channelId) ?? new Set<string>();
    members.add(input.owner);
    for (const id of input.userIds ?? []) members.add(id);
    this.groups.set(input.channelId, members);
  }

  async joinGroup(channelId: string, userIds: string[]) {
    this.record({kind: 'joinGroup', channelId, userIds});
    const members = this.groups.get(channelId) ?? new Set<string>();
    for (const id of userIds) members.add(id);
    this.groups.set(channelId, members);
  }

  async muteMember(channelId: string, userId: string) {
    this.record({kind: 'muteMember', channelId, userId});
    const set = this.muted.get(channelId) ?? new Set<string>();
    set.add(userId);
    this.muted.set(channelId, set);
  }

  async unmuteMember(channelId: string, userId: string) {
    this.record({kind: 'unmuteMember', channelId, userId});
    this.muted.get(channelId)?.delete(userId);
  }

  async expireTokens(userId: string, beforeMs: number) {
    this.record({kind: 'expireTokens', userId, beforeMs});
  }

  async disconnectUser(userId: string) {
    this.record({kind: 'disconnectUser', userId});
  }

  async muteInDirectChannels(userId: string) {
    this.record({kind: 'muteInDirectChannels', userId});
  }

  isMuted(channelId: string, userId: string) {
    return this.muted.get(channelId)?.has(userId) ?? false;
  }
}
