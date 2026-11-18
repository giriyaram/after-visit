# Event listeners

ChatUI SDK dispatches events from [NCChatUIApplication](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/NCChatUIApplication.html). Your app can subscribe to them and, for some events, override the default behavior with [ChatUIEvent](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/ChatUIEvent.html) methods such as `preventDefault` and `sendResult`.

Event names are defined by the [ChatUIEvents](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/ChatUIEvents.html) enum.

TypeScript

```ts
import { ChatUIEvents } from '@nexconn/chatui';

```

## Add a listener[​](#add-a-listener "Direct link to Add a listener")

TypeScript

```ts
app.addEventListener(ChatUIEvents.ALERT_EVENT, (evt) => {
  const { data } = evt;
  console.log('Alert:', data);
});

```

| Argument  | Type     | Required | Description                                                                                                                                                |
| --------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eventType | string   | Yes      | A value from [ChatUIEvents](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/ChatUIEvents.html)                                         |
| listener  | function | Yes      | Callback receiving a concrete event object (extends [ChatUIEvent](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/ChatUIEvent.html)) |
| target    | object   | No       | Optional `this` binding                                                                                                                                    |

## ChatUIEvent[​](#chatuievent "Direct link to ChatUIEvent")

Callbacks receive [ChatUIEvent](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/ChatUIEvent.html) or a subclass.

### preventDefault[​](#preventdefault "Direct link to preventDefault")

For events whose dispatch path checks it, blocks the SDK default behavior (for example a built-in dialog). Example with `ALERT_EVENT`:

TypeScript

```ts
const listener = (evt) => {
  const { data } = evt;
  evt.preventDefault();
  alert(data);
};

app.addEventListener(ChatUIEvents.ALERT_EVENT, listener);

```

### stopImmediatePropagation[​](#stopimmediatepropagation "Direct link to stopImmediatePropagation")

Stops later listeners for the same event object.

TypeScript

```ts
const listener = (evt) => {
  evt.stopImmediatePropagation();
};

```

### sendResult[​](#sendresult "Direct link to sendResult")

Some events expect a result back from your code. When that happens, call `sendResult` once. `CONFIRM_EVENT` is the most common example:

TypeScript

```ts
const listener = (evt) => {
  const { data } = evt;
  evt.preventDefault();
  const ok = window.confirm(String(data));
  evt.sendResult(ok);
};

app.addEventListener(ChatUIEvents.CONFIRM_EVENT, listener);

```

Only the first `sendResult` call is used. Later calls log an error and do not change the result.

## Remove a listener[​](#remove-a-listener "Direct link to Remove a listener")

TypeScript

```ts
app.removeEventListener(ChatUIEvents.ALERT_EVENT, listener);

```

## Event catalog[​](#event-catalog "Direct link to Event catalog")

Primary events exported on `ChatUIEvents` (see `@nexconn/chatui` for the full list):

Each event uses one of the following dispatch modes:

* **Mode 0:** ChatUI dispatches the event to your app first. If a listener calls `preventDefault()`, ChatUI does not continue with its internal handling.
* **Mode 1:** ChatUI dispatches the event to both your app and its internal handlers. Your app cannot prevent the internal handling or return a result.
* **Mode 2:** ChatUI dispatches the event only to your app. ChatUI does not process the event through an internal event handler.

| Constant                         | Dispatch mode | Description                                                                                                                                         |
| -------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ALERT\_EVENT                     | 0             | Informational alert                                                                                                                                 |
| CONFIRM\_EVENT                   | 0             | Confirmation dialog; may use `sendResult` with a boolean                                                                                            |
| MEDIA\_MESSAGE\_MODAL\_EVENT     | 0             | Media message modal                                                                                                                                 |
| COMBINE\_MESSAGE\_MODAL\_EVENT   | 0             | Combined forward / chat history modal                                                                                                               |
| FORWARDING\_EVENT                | 0             | Forward modal; may use [ModalForwardingResult](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/ModalForwardingResult.html) |
| TAKE\_PHOTO\_MODAL\_EVENT        | 0             | Camera capture modal                                                                                                                                |
| UNSCHEDULED\_MESSAGES            | 0             | Messages not handled by the default UI path                                                                                                         |
| CHANNEL\_PANEL\_EXTENSION\_TOUCH | 0             | Channel header extension button                                                                                                                     |
| SYSTEM\_CHANNEL\_OPENING         | 2             | Built-in channel-list flow before opening a system channel                                                                                          |
| CHANNELS\_MENU\_ITEM\_CLICK      | 0             | Channel list context menu item                                                                                                                      |
| INPUT\_MENU\_ITEM\_CLICK         | 2             | Input toolbar item                                                                                                                                  |
| MESSAGE\_INPUT\_FOCUS            | 1             | Message input focused                                                                                                                               |
| MESSAGE\_INPUT\_BLUR             | 1             | Message input blurred                                                                                                                               |
| MESSAGE\_INPUT\_CHANGE           | 1             | Message input changed by user input                                                                                                                 |
| MESSAGE\_WILL\_SEND              | 1             | Before ChatUI creates and sends a local message                                                                                                     |
| CHANNEL\_SELECTED                | 1             | Active channel changed                                                                                                                              |
| CHANNEL\_ICON\_CLICK             | 2             | Channel avatar clicked                                                                                                                              |
| CHANNEL\_NAVI\_CLICK             | 2             | Channel navigation area clicked                                                                                                                     |
| MESSAGE\_MENU\_ITEM\_CLICK       | 0             | Message context menu item                                                                                                                           |
| MESSAGE\_LINK\_CLICK             | 0             | Link inside a message                                                                                                                               |
| DOWNLOAD\_LINK\_EVENT            | 0             | Media download                                                                                                                                      |
| FILE\_SEND\_FAILED\_EVENT        | 0             | File send failed                                                                                                                                    |
| MESSAGES\_DELETED                | 1             | Messages deleted notification                                                                                                                       |
| TOAST\_EVENT                     | 0             | Toast notification                                                                                                                                  |

## Message input events[​](#message-input-events "Direct link to Message input events")

Since `26.2.4`, ChatUI emits focus, blur, and user-input change events from the built-in message editor.

TypeScript

```ts
import { ChatUIEvents } from '@nexconn/chatui';

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_FOCUS, (evt) => {
  console.log('focus value:', evt.data.value);
});

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_BLUR, (evt) => {
  console.log('blur value:', evt.data.value);
});

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_CHANGE, (evt) => {
  console.log('changed value:', evt.data.value);
});

```

`event.data` uses [MessageInputEventData](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/MessageInputEventData.html):

| Field | Type   | Description                 |
| ----- | ------ | --------------------------- |
| value | string | Current message input value |

`MESSAGE_INPUT_CHANGE` is emitted for user input changes. Internal behaviors such as restoring drafts, switching channels, or programmatically setting editor content are not guaranteed to emit this event.

## Before sending a message[​](#before-sending-a-message "Direct link to Before sending a message")

Since `26.2.4`, `MESSAGE_WILL_SEND` is emitted after ChatUI has prepared message sending parameters and before it creates the local message model and enters the send flow.

Use this event when your app needs to synchronously add business metadata, push payload data, or other send parameters to all built-in send paths.

TypeScript

```ts
import { ChatUIEvents, type MessageWillSendEvent } from '@nexconn/chatui';

app.addEventListener(
  ChatUIEvents.MESSAGE_WILL_SEND,
  (evt: MessageWillSendEvent) => {
    evt.data.params.content.extra = JSON.stringify({
      tenantId: 'tenant-a',
      source: 'crm',
    });

    evt.data.params.pushContent = {
      title: 'New message',
    };
  }
);

```

`event.data` uses [MessageWillSendEventData](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/MessageWillSendEventData.html):

| Field             | Type                | Description                                                      |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| channelIdentifier | `ChannelIdentifier` | Target channel from `@nexconn/chat`                              |
| params            | `SendMessageParams` | Mutable send parameters for the message that is about to be sent |

The event covers built-in ChatUI send paths such as text, quoted text, image, file, forward, and failed-message resend.

important

Make parameter changes synchronously inside the listener. Async changes may run after ChatUI has already created and queued the message, so they are not guaranteed to affect the current send. `MESSAGE_WILL_SEND` is not a cancelable send interception event.

## System channel opening[​](#system-channel-opening "Direct link to System channel opening")

`SYSTEM_CHANNEL_OPENING` is dispatched when a user opens a system channel from ChatUI's built-in channel list, before ChatUI opens the channel.

In the current implementation, treat `SYSTEM_CHANNEL_OPENING` as an observation event. Do not rely on `preventDefault()` to cancel the built-in system-channel opening flow until the SDK confirms cancellation support for this event.

Programmatic calls such as `app.openChannel(new SystemChannelIdentifier(...))` do not dispatch `SYSTEM_CHANNEL_OPENING`. Listen to `CHANNEL_SELECTED` if you need to observe all channel changes, including direct calls to `openChannel`.
