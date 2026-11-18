# Get message history

Retrieve message history from the server. On the Web platform, messages are not stored locally — all history is fetched from the remote server.

## Get remote messages for a channel[​](#get-remote-messages-for-a-channel "Direct link to Get remote messages for a channel")

TypeScript

```ts
import { DirectChannel, BaseChannel, Message } from '@nexconn/chat';

const channel = new DirectChannel('<target-user-id>');

const query = BaseChannel.createMessagesQuery({
  channelIdentifier: channel.identifier,
  startTime: Date.now(), // Start time — fetches messages before this timestamp
  pageSize: 20,          // Number of messages per page (valid range: 1–100)
  isAscending: false,    // false: descending (newest first), true: ascending
});
const { code, data: page } = await query.loadNextPage();
if (code === 0) {
  const messages: Message<Record<string, any>>[] = page.data;
  console.log('Messages:', messages);
} else {
  console.log('Failed to get messages. Code:', code);
}

```

### Parameters[​](#parameters "Direct link to Parameters")

| Parameter           | Type                | Required | Description                                                                                   |
| ------------------- | ------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `channelIdentifier` | `ChannelIdentifier` | Yes      | The channel identifier (use `channel.identifier`)                                             |
| `startTime`         | `number`            | No       | Unix timestamp in milliseconds. Defines the starting point for paginated history.             |
| `pageSize`          | `number`            | No       | Number of messages to fetch. Valid range: 1–100. Default: `20`.                               |
| `isAscending`       | `boolean`           | No       | `false` for descending (newest first), `true` for ascending (oldest first). Default: `false`. |

## Paginated loading[​](#paginated-loading "Direct link to Paginated loading")

To load earlier messages, call `loadNextPage()` again on the same query object. The query automatically tracks the last fetched position:

TypeScript

```ts
const nextPage = await query.loadNextPage();
if (nextPage.code === 0) {
  console.log('Next page:', nextPage.data.data);
}

```

info

On the Web platform, there is no local message storage. Every call to `loadNextPage()` fetches from the server. Consider caching messages in your application state for better performance.
