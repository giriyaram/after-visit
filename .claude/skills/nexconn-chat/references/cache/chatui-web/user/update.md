# Data updates

Beyond [ServiceHooks](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/ServiceHooks.html), [NCChatUIApplication](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/NCChatUIApplication.html) exposes cache helpers so you can refresh UI after profile changes.

tip

`app` refers to the instance returned from `NCChatUIApplication.initialize`. Call these update APIs after `ready()`.

## Update a user[​](#update-a-user "Direct link to Update a user")

`updateUserProfile` refreshes display fields such as nickname and avatar.

TypeScript

```ts
app.updateUserProfile({
  userId: 'userId',
  name: 'Display name',
  avatarUrl: 'https://example.com/avatar.png',
});

```

## Update a group[​](#update-a-group "Direct link to Update a group")

`updateGroupProfile` updates name, avatar, member count, etc. (not the full member list).

TypeScript

```ts
app.updateGroupProfile({
  groupId: 'groupId',
  name: 'Group name',
  avatarUrl: 'https://example.com/group.png',
  memberCount: 10,
});

```

## Update presence[​](#update-presence "Direct link to Update presence")

TypeScript

```ts
app.updateUserOnlineStatus('userId', true);

```

## Update group members[​](#update-group-members "Direct link to Update group members")

These three helpers update ChatUI's local cache and UI state only. They do not call group-management server APIs.

### Add members[​](#add-members "Direct link to Add members")

TypeScript

```ts
app.addGroupMembers('groupId', [
  { userId: 'user-01', nickname: 'Member 01' },
  { userId: 'user-02' },
]);

```

### Remove members[​](#remove-members "Direct link to Remove members")

TypeScript

```ts
app.removeGroupMembers('groupId', ['user-01', 'user-02']);

```

### Replace the roster[​](#replace-the-roster "Direct link to Replace the roster")

TypeScript

```ts
app.updateGroupMembers('groupId', [
  { userId: 'user-01', nickname: 'Member 01' },
  { userId: 'user-02' },
]);

```
