# Pre-messaging

Pre-messaging events fire **before** a message is delivered to its recipients. Your server receives the pending message and can respond to modify its content, push settings, or metadata, or to block delivery entirely.

There are four event types — one per channel type — but they all share the same payload structure.

note

Pre-messaging events are available on **Chat Free** and **Chat Pro**. They are not supported on Starter, where the option is disabled in the console.

For the complete webhook setup and signature verification guide, see [Webhooks overview](/platform-chat-api/webhook/overview.md).

## Event types[​](#event-types "Direct link to Event types")

| Event type                        | Channel                     |
| --------------------------------- | --------------------------- |
| `direct_channel:pre_messaging`    | Direct channel (one-to-one) |
| `group_channel:pre_messaging`     | Group channel               |
| `open_channel:pre_messaging`      | Open channel                |
| `community_channel:pre_messaging` | Community channel           |

## How it works[​](#how-it-works "Direct link to How it works")

Pre-messaging events are **synchronous**. Nexconn waits for your server's response (up to 5 seconds) before deciding whether to proceed with message delivery.

Your server responds with a JSON body containing a required `pass` field to control delivery:

| Response action          | How to signal it                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Allow delivery unchanged | Return HTTP `200` with `pass` set to `1` or `2`. Omit modification fields to leave original values.                              |
| Modify the message       | Return HTTP `200` with `pass` set to `1` or `2`, plus the fields you want to override (see [Response fields](#response-fields)). |
| Block delivery           | Return HTTP `200` with `pass` set to `0`. Include `extra` to pass data back to the sender.                                       |

If your server does not respond within 5 seconds, Nexconn sends the event up to three times in total. If all three attempts time out, Nexconn delivers the original message without applying any pre-messaging changes.

## Payload[​](#payload "Direct link to Payload")

### Envelope[​](#envelope "Direct link to Envelope")

| Field  | Type     | Required | Description                                                                 |
| ------ | -------- | -------- | --------------------------------------------------------------------------- |
| `type` | `String` | Yes      | One of the four event types listed above.                                   |
| `id`   | `String` | Yes      | Unique event ID.                                                            |
| `time` | `Long`   | Yes      | Event generation time (Unix ms).                                            |
| `data` | `Array`  | Yes      | Array containing one pre-messaging object. See [Data fields](#data-fields). |

### Data fields[​](#data-fields "Direct link to Data fields")

| Field               | Type       | Required | Description                                                                                        |
| ------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| `appKey`            | `String`   | Yes      | The App Key for the application.                                                                   |
| `userId`            | `String`   | Yes      | The sender's user ID.                                                                              |
| `channelId`         | `String`   | Yes      | Target channel ID: recipient user ID (direct), group ID, open channel ID, or community channel ID. |
| `channelType`       | `Number`   | Yes      | Channel type. See [Channel types](/platform-chat-api.md#channel-types).                            |
| `messageType`       | `String`   | Yes      | Message type identifier (e.g., `RC:TxtMsg`, `RC:ImgMsg`).                                          |
| `content`           | `String`   | Yes      | Message content body as a JSON string.                                                             |
| `time`              | `Long`     | Yes      | Time the server received the message (Unix ms).                                                    |
| `messageId`         | `String`   | Yes      | Unique message identifier.                                                                         |
| `os`                | `String`   | Yes      | Sender's platform. One of: `iOS`, `Android`, `Websocket`, `Server`.                                |
| `pushContent`       | `String`   | No       | Push notification text.                                                                            |
| `disablePush`       | `Boolean`  | No       | Whether push notifications are suppressed for this message.                                        |
| `pushConfig`        | `String`   | No       | Extended push configuration as a JSON string.                                                      |
| `isMetadata`        | `Boolean`  | No       | Whether the message supports metadata.                                                             |
| `metadata`          | `Object`   | No       | Message metadata key-value pairs.                                                                  |
| `groupUserIds`      | `String[]` | No       | Recipient user IDs for targeted group messages. Only present for directed messages.                |
| `originalMessageId` | `String`   | No       | Original message ID. Only present in community channels.                                           |
| `subchannelId`      | `String`   | No       | Community channel subchannel ID. Only present in community channels.                               |
| `clientIp`          | `String`   | No       | The sender's IP address and port.                                                                  |
| `aiGenerated`       | `Boolean`  | No       | Whether the message was generated by AI. Only returned when the feature is enabled.                |

### Response fields[​](#response-fields "Direct link to Response fields")

| Field                | Type      | Required | Description                                                                                                                                       |
| -------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pass`               | `Int`     | Yes      | Delivery control. `0` = block delivery. `1` = allow delivery and continue remaining callbacks. `2` = allow delivery and skip remaining callbacks. |
| `replaceContent`     | `String`  | No       | Replacement message content (JSON structure). Supports up to six levels of nesting. Empty string or omitted = keep original.                      |
| `replacePushContent` | `String`  | No       | Replacement push notification text. Empty string or omitted = keep original.                                                                      |
| `replaceDisablePush` | `Boolean` | No       | Silent message override. `true` = suppress offline push notifications. Defaults to `false`.                                                       |
| `replacePushConfig`  | `String`  | No       | Replacement push configuration (JSON string). Keep ≤ 1.5 KB. Empty string or omitted = keep original.                                             |
| `replaceMetadata`    | `Object`  | No       | Replaces `metadata`. Format: `{"key": {"v": "value"}}`. Key ≤ 32 chars, value ≤ 4096 chars.                                                       |
| `extra`              | `String`  | No       | Data returned to the sender via the client's sensitive-message interception callback. Valid only when `pass` is `0`. Max 1024 chars.              |

## Example[​](#example "Direct link to Example")

### Response[​](#response "Direct link to Response")

JSON

```json
{
  "pass": 1,
  "replaceContent": "{\"content\":\"Hello [*** replaced]\"}",
  "replacePushContent": "You have a new message",
  "replaceDisablePush": false,
  "replacePushConfig": "{\"pushTitle\":\"System notification\"}",
  "replaceMetadata": {
    "ai_reviewed": {
      "v": "true",
      "t": 1710652800
    }
  }
}

```

### `direct_channel:pre_messaging`[​](#direct_channelpre_messaging "Direct link to direct_channelpre_messaging")

JSON

```json
{
  "type": "direct_channel:pre_messaging",
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "time": 1730192400000,
  "data": [
    {
      "appKey": "your_app_key",
      "userId": "user_001",
      "channelId": "user_002",
      "channelType": 1,
      "messageType": "RC:TxtMsg",
      "content": "{\"content\":\"Hello\",\"extra\":\"\"}",
      "pushContent": "user_001: Hello",
      "disablePush": false,
      "pushConfig": "{}",
      "isMetadata": false,
      "time": 1730192400000,
      "messageId": "msg_pre_001",
      "os": "iOS",
      "clientIp": "192.168.1.100:12345"
    }
  ]
}

```
