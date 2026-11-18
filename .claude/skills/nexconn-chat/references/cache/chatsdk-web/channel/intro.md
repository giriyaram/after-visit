# Channel overview

A channel represents a messaging context between participants. Each channel has a type, a target ID, and maintains state such as unread count, last message, and notification settings.

## Channel types[​](#channel-types "Direct link to Channel types")

| Channel type      | Class                                      | Description                                                                        |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Direct channel    | `DirectChannel`                            | One-to-one messaging between two users                                             |
| Group channel     | `GroupChannel`                             | Messaging within a group                                                           |
| Open channel      | `OpenChannel`                              | A public channel that users can join and leave freely, similar to a live chat room |
| Community channel | `CommunityChannel` / `CommunitySubChannel` | Large-scale community with subchannels                                             |
| System channel    | —                                          | System notifications sent from the server                                          |

## Channel properties[​](#channel-properties "Direct link to Channel properties")

Each channel object contains the following key properties:

| Property        | Type                   | Description                                                             |
| --------------- | ---------------------- | ----------------------------------------------------------------------- |
| `channelType`   | `ChannelType`          | The type of the channel                                                 |
| `channelId`     | `string`               | The unique identifier of the channel's target (user ID, group ID, etc.) |
| `unreadCount`   | `number`               | Number of unread messages                                               |
| `latestMessage` | `Message<any> \| null` | The most recent message in the channel                                  |
| `operationTime` | `number`               | Timestamp (ms) of the most recent operation                             |
| `isPinned`      | `boolean`              | Whether the channel is pinned                                           |
| `draft`         | `string`               | Draft text saved for the channel                                        |

## Channel lifecycle[​](#channel-lifecycle "Direct link to Channel lifecycle")

* Channels are automatically created when a message is sent or received.
* You can retrieve, pin, mute, and delete channels using the SDK API.
* On the Web platform, channel lists are fetched from the server (no local persistence).

## Next steps[​](#next-steps "Direct link to Next steps")

* [Get channel list](/chatsdk-web/channel/get-list.md)
* [Manage unread count](/chatsdk-web/channel/unread.md)
* [Pin a channel](/chatsdk-web/channel/stick-to-top.md)
* [Do not disturb](/chatsdk-web/channel/do-not-disturb-about.md)
