# Feature switches

ChatUI exposes feature toggles through [ChatUICommand](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/ChatUICommand.html) with `setCommandSwitch` / `getCommandSwitch`. Call them **before `app.ready()`**.

## Switch reference[​](#switch-reference "Direct link to Switch reference")

| Command                                                | Description                                                                                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatUICommand.SHOW_CONNECTION_STATUS_IN_CHANNEL_LIST` | Show connection status hints in the channel list region.                                                                                     |
| `ChatUICommand.SHOW_MESSAGE_STATE`                     | Show delivery/read style states (when off, only minimal states such as sending/failed may remain).                                           |
| `ChatUICommand.MENTION_ALL`                            | Allow `@all` in group channels.                                                                                                              |
| `ChatUICommand.PROMPT_SENDER_WHEN_QUOTE_MESSAGE`       | When quoting, default-mention the original author.                                                                                           |
| `ChatUICommand.DELETE_MESSAGES_WHILE_DELETE_CHANNEL`   | When deleting a channel, also call `deleteMessagesForMeByTimestamp` to clear the current user's server-side message history in that channel. |

## Read and write[​](#read-and-write "Direct link to Read and write")

TypeScript

```ts
import { ChatUICommand } from '@nexconn/chatui';

app.setCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE, true);

const on = app.getCommandSwitch(ChatUICommand.SHOW_MESSAGE_STATE);

```
