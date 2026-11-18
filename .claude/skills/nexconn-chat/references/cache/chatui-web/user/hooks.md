# Hooks

Hooks let your backend supply user, group, system channel, and member data whenever ChatUI needs it. You must implement the required methods on [ServiceHooks](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/ServiceHooks.html) when calling `NCChatUIApplication.initialize`.

tip

Samples use TypeScript to document shapes clearly.

## Interface[​](#interface "Direct link to Interface")

[ServiceHooks](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/ServiceHooks.html) matches `@nexconn/chatui` exports:

TypeScript

```ts
export interface ServiceHooks {
  reqUserProfiles(userIds: string[]): Promise<ChatUIUserProfile[]>;
  reqGroupProfiles(groupIds: string[]): Promise<GroupProfile[]>;
  /** Called when the channel list contains system channels (`ChannelType.SYSTEM`) */
  reqSystemProfiles(systemIds: string[]): Promise<ChatUISystemProfile[]>;
  reqGroupMembers(groupId: string): Promise<GroupMemberProfile[]>;
  getDefaultUserProfile?(userId: string): ChatUIUserProfile;
  getDefaultGroupProfile?(groupId: string): GroupProfile;
  getDefaultSystemProfile?(systemId: string): ChatUISystemProfile;
}

```

> ChatUI validates the returned profiles. User, group, and system profiles all require a non-empty `name`, and `GroupProfile` also requires `memberCount >= 0`.

## Calls and caching[​](#calls-and-caching "Direct link to Calls and caching")

ChatUI caches `reqUserProfiles`, `reqGroupProfiles`, and related responses to avoid duplicate work.

<!-- -->

When data changes, call `updateUserProfile`, `updateGroupProfile`, and related helpers—see [Data updates](/chatui-web/user/update.md).

## Example[​](#example "Direct link to Example")

TypeScript

```ts
import type { ServiceHooks, ChatUIUserProfile } from '@nexconn/chatui';
import type { GroupProfile, GroupMemberProfile } from '@nexconn/chatui';
import type { ChatUISystemProfile } from '@nexconn/chatui';
import { NCChatUIApplication } from '@nexconn/chatui';

const hooks: ServiceHooks = {
  async reqUserProfiles(userIds: string[]): Promise<ChatUIUserProfile[]> {
    return userIds.map((userId) => ({
      userId,
      name: `User ${userId}`,
    }));
  },
  async reqGroupProfiles(groupIds: string[]): Promise<GroupProfile[]> {
    return groupIds.map((groupId) => ({
      groupId,
      name: `Group ${groupId}`,
      memberCount: 0,
    }));
  },
  async reqGroupMembers(groupId: string): Promise<GroupMemberProfile[]> {
    return [
      { userId: 'user-01', nickname: 'Member 01' },
      { userId: 'user-02' },
    ];
  },
  async reqSystemProfiles(systemIds: string[]): Promise<ChatUISystemProfile[]> {
    return systemIds.map((systemId) => ({
      systemId,
      name: `System ${systemId}`,
    }));
  },
};

const app = NCChatUIApplication.initialize({ hooks });
if (!app) {
  throw new Error('ChatUI initialize failed');
}
app.ready();

```
