# Sync unread status across devices

When a user reads a channel on one device, call `clearUnreadCount()` to clear the channel's unread count. The cleared unread status is synced to the user's other online devices, so those devices also stop showing an unread badge for the same channel.

This feature syncs the current user's unread status across devices. It does not send per-message read receipts to message senders. For per-message read receipts, see [Use read receipts](/chatsdk-web/message/read-receipt.md).

## How it works[​](#how-it-works "Direct link to How it works")

1. The user opens or reads a channel on Device A.
2. Device A calls `clearUnreadCount()` for that channel.
3. The SDK clears the unread count locally and syncs the updated unread status through the server.
4. The user's other online devices receive the channel status sync and update their local unread count for the same channel.

## Clear unread count and sync the status[​](#clear-unread-count-and-sync-the-status "Direct link to Clear unread count and sync the status")

Clear the unread count when the user has read the channel:

TypeScript

```ts
import { DirectChannel } from '@nexconn/chat';

const channel = new DirectChannel('<target-user-id>');
const { code } = await channel.clearUnreadCount();
if (code === 0) {
  console.log('Unread count cleared and sync requested');
}

```

## Listen for unread status sync completion[​](#listen-for-unread-status-sync-completion "Direct link to Listen for unread status sync completion")

When another device clears the unread count, the current device receives channel status sync updates. Register a `ChannelHandler` to know when the sync is complete and refresh unread badges if needed:

TypeScript

```ts
import { NCEngine, ChannelHandler } from '@nexconn/chat';

NCEngine.addChannelHandler('sync-handler', new ChannelHandler({
  onChannelStatusSyncCompleted({ code }) {
    // Called when channel status data, including unread status, finishes syncing
    console.log('Channel status sync completed. Code:', code);
  },
  onCommunityChannelsSyncCompleted() {
    // Called when community channel sync completes
    console.log('Community channels sync completed');
  },
}));

```

info

Multi-device unread status sync requires the multi-device online feature to be enabled. See [Multi-device online](/chatsdk-web/user/multiple-platform.md).
