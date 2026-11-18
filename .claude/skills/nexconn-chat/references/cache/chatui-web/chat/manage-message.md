# Message management

ChatUI updates lists as messages flow. To keep UI and engine state aligned, **prefer ChatUI’s `sendMessage` / `insertMessage`** instead of bypassing ChatUI with low-level send APIs unless you understand the UI impact.

tip

Call both `sendMessage` and `insertMessage` after `app.ready()`. If you call them earlier, the SDK returns `NCChatUICode.CHATUI_NOT_READY` (`39001`).

## Limits[​](#limits "Direct link to Limits")

Typical constraints (confirm per release):

* Upload size caps for images and files follow console and SDK guidance.
* Oversized GIFs may downgrade to file messages.
* Short video duration caps apply.

## Send a message[​](#send-a-message "Direct link to Send a message")

Use `sendMessage` on [NCChatUIApplication](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/NCChatUIApplication.html): first argument is a channel identifier, second is a `SendMessageParams` subtype from `@nexconn/chat` (for example `SendTextMessageParams`).

TypeScript

```ts
import { DirectChannelIdentifier, SendTextMessageParams } from '@nexconn/chat';

const result = await app.sendMessage(
  new DirectChannelIdentifier('peerUserId'),
  new SendTextMessageParams({ text: 'Hello' })
);

if (!result.isOk) {
  console.error('send failed', result.code);
}

```

See Nexconn Chat docs for additional message types.

## Modify parameters before sending[​](#modify-parameters-before-sending "Direct link to Modify parameters before sending")

Since `26.2.4`, ChatUI emits [ChatUIEvents](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/ChatUIEvents.html) `MESSAGE_WILL_SEND` before creating the local message model and entering the send flow. Listen to it when your app needs to add business metadata or push payload fields consistently across built-in send paths.

TypeScript

```ts
import { ChatUIEvents, type MessageWillSendEvent } from '@nexconn/chatui';

app.addEventListener(
  ChatUIEvents.MESSAGE_WILL_SEND,
  (evt: MessageWillSendEvent) => {
    const { channelIdentifier, params } = evt.data;

    params.content.extra = JSON.stringify({
      tenantId: 'tenant-a',
      channelId: channelIdentifier.channelId,
    });

    params.pushContent = {
      title: 'New support message',
    };
  }
);

```

The event data uses [MessageWillSendEventData](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/MessageWillSendEventData.html) and includes the target `channelIdentifier` plus mutable `params`.

important

Only synchronous changes are guaranteed to affect the current message. This event is not a send-button click event and does not cancel sending.

## Insert a message[​](#insert-a-message "Direct link to Insert a message")

[insertMessage](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/NCChatUIApplication.html#insertMessage) inserts a `Message` instance wrapped by [ChatUIMessageModel](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/ChatUIMessageModel.html) into the current UI (for example placeholders or replay data). Persistence rules follow the platform.

TypeScript

```ts
import {
  DirectChannelIdentifier,
  Helper,
  SendTextMessageParams,
} from '@nexconn/chat';

const message = Helper.createMessage(
  new DirectChannelIdentifier('peerUserId'),
  new SendTextMessageParams({ text: 'Local message' })
);
message.sentTime = Date.now();

const result = await app.insertMessage(message);

```

tip

Web caching differs from desktop shells; reloading may drop data that existed only locally—validate against your product requirements.
