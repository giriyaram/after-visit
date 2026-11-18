# Chat glossary

This glossary defines the core concepts and terminology used across Nexconn's Chat SDK documentation, Server API references, and integration guides.

***

## Platform & credentials[​](#platform--credentials "Direct link to Platform & credentials")

### Console[​](#console "Direct link to Console")

The [Nexconn Console](https://console.nexconn.ai) is the web portal for creating and managing your Nexconn applications. From the Console, you can:

* Create applications and retrieve credentials (App Key and App Secret)
* Enable and configure chat, push notification, and real-time audio/video services
* View the application's Chat plan and usage
* Monitor usage and adjust service settings

![](/assets/console/console-overview.png)

### App Key / App Secret[​](#key "Direct link to App Key / App Secret")

The credential pair that identifies your application to Nexconn services.

* **App Key** — Required when initializing the Chat SDK. Included in every SDK connection to Nexconn servers.
* **App Secret** — Used server-side to authenticate API requests. Never expose it in client-side code.

Each Nexconn application has one App Key and App Secret pair. New applications start on the **Free** plan, which is valid for one month and does not require a credit card. You can use the same App Key throughout development, testing, and release.

***

## Connection & identity[​](#connection--identity "Direct link to Connection & identity")

### Access token[​](#token "Direct link to Access token")

The identity credential for a connected user — referenced as `token` in the SDK. Every user requires a valid access token to establish a connection with Nexconn servers.

* Tokens are issued by your app server via the Server API [Get Access Token](https://docs.nexconn.ai) endpoint.
* Each token is tied to a specific user ID. Issue a new token whenever the user changes.
* Pass a fresh token on every `connect()` call.

### Target ID[​](#target-id "Direct link to Target ID")

The identifier for a chat channel, passed as the `targetId` parameter in SDK calls. The message sender is identified separately by `senderUserId`.

Target ID semantics vary by channel type:

| Channel Type      | Target ID                                                |
| ----------------- | -------------------------------------------------------- |
| Direct Channel    | The **other user's ID** (not symmetric — see note below) |
| Group Channel     | The group ID                                             |
| Open Channel      | The open channel ID                                      |
| Community Channel | The community channel ID                                 |

Direct Channel Target ID asymmetry

In a direct channel between User A and User B:

* From User A's perspective: `targetId` = User B's ID
* From User B's perspective: `targetId` = User A's ID

When inserting messages via the Server API "insert message" endpoint, always pass the other user's ID as `targetId` — regardless of whether the message was sent or received by the current user.

### Navigation domain[​](#nav "Direct link to Navigation domain")

The service endpoint the SDK contacts at startup to obtain the IM server's long-connection address and bootstrap configuration. The SDK uses the returned address to establish its persistent connection to Nexconn IM servers.

### Application identifier[​](#app-id "Direct link to Application identifier")

A unique identifier for your app on a user's device. Register it in **Console > Application Identifier** to enable push notifications.

* **iOS**: use the `Bundle Identifier`
* **Android**: use the `ApplicationId`

Multiple application identifiers can be registered under one App Key. Users across different identifiers on the same App Key can still message each other.

### Bundle identifier[​](#identifier "Direct link to Bundle identifier")

The package name that uniquely identifies an iOS app on a device (e.g., `com.example.myapp`). Configure it in **Console > Application Identifier** to enable iOS push notifications via APNs.

### ApplicationId[​](#applicationid "Direct link to ApplicationId")

The unique application ID for an Android app (e.g., `com.example.myapp`), analogous to a Java package name. Identifies your app on devices and in the Google Play Store.

Configure it in your app-level `build.gradle`:

Groovy

```groovy
android {
    defaultConfig {
        applicationId "com.example.myapp"
    }
}

```

If `applicationId` is not explicitly set, it defaults to the package name. Register it in **Console > Application Identifier** to enable Android push notifications. See [Android documentation](https://developer.android.com/studio/build/configure-app-module#set_the_application_id) for details.

***

## Channel types[​](#channel-types "Direct link to Channel types")

Nexconn organizes all messaging into channels. Each channel type is optimized for a different communication scenario.

### Direct channel[​](#direct "Direct link to Direct channel")

A private one-to-one channel between exactly two users. By default, Nexconn does not check friendship status when users send direct messages, so a direct channel can exist between any two users. Friend management APIs are available if your app needs to maintain friend relationships.

* Push notifications are sent when the app is backgrounded or terminated.
* Messages are retained according to your Cloud retention configuration.

### Group channel[​](#group "Direct link to Group channel")

A group channel for multiple users, supporting up to 300 members per group by default.

* Group membership is provided and maintained by your app server — Nexconn does not manage it.
* Nexconn delivers messages to all group members.
* Push notifications are sent when the app is backgrounded or terminated.
* No limit on the number of groups per application. A single user can join up to 1,000 groups on Free, 2,000 on Starter, and 5,000 on Pro.
* For applications with more than 10,000 monthly active users, the member limit can be raised to 1,000 on Starter or 3,000 on Pro.

### Community channel[​](#ultragroup "Direct link to Community channel")

A large-scale channel format for building communities and social spaces. Available on the Free and Pro plans; not supported on Starter. Community Channels go beyond standard group channels by adding:

* **Up to 10,000 members per channel** — raisable to 1,000,000 for applications above 10,000 MAU
* **Independent subchannels** — partition messages and unread counts by topic or audience
* **User groups** — segment members for targeted messaging
* **Public and private subchannels** — control visibility per subchannel

Each user can join up to 100 Community Channels. No limit on the number of Community Channels per application.

See also: [Subchannel](#channel)

### Open channel[​](#chatroom "Direct link to Open channel")

A high-throughput broadcast channel with no member limit. Designed for live streaming, live events, and public chat.

* Massive concurrent messages arrive instantly.
* Users exit the channel when they leave the interface and immediately stop receiving messages.
* **No push notifications** — messages are only delivered while the user is active in the channel.
* Channels are created and managed by Nexconn; the SDK provides join/leave methods.
* The Free plan supports up to 50 concurrent Open Channels. Starter and Pro have no limit.

### System channel[​](#system "Direct link to System channel")

A reserved channel type for platform-level notifications. Operators use configured system accounts — which regular users cannot log into — to send messages and broadcasts via the Server API.

* Messages can be sent to specific users or broadcast to all users in the application.
* Clients can view messages in System Channels but cannot reply.
* Used primarily for operational notifications such as alerts, announcements, and account activity.

See also: [System Message](#system-message), [Broadcast](#broadcast)

### Subchannel[​](#channel "Direct link to Subchannel")

An independent message partition within a Community Channel. Members of the same Community Channel can freely participate in different subchannels, with full message isolation between them. Only Community Channels support subchannels.

Subchannel types:

| Type                   | Access                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| **Public subchannel**  | Open to all Community Channel members with no join required                 |
| **Private subchannel** | Visible and accessible only to explicitly added members                     |
| **Default subchannel** | Provided automatically; open to all members; cannot be converted to private |

***

## Channel features[​](#channel-features "Direct link to Channel features")

### Channel list[​](#channel-list "Direct link to Channel list")

The interface that lists a user's active channels in ranked order. Ranking is determined by factors such as pinned status and last message timestamp. Open Channels do not appear in the channel list.

### Chat interface[​](#chat-interface "Direct link to Chat interface")

The messaging view for a specific channel. A standard chat interface displays message content, user avatars and names, and an input area supporting text, emoji, voice, short video, audio/video calls, and custom message types. The input area, message bubbles, and content display components are all customizable.

***

## Messaging[​](#messaging "Direct link to Messaging")

### Offline messages[​](#offline "Direct link to Offline messages")

Messages delivered to a user while they were not connected. Nexconn retains undelivered messages for **7 days**. When the recipient reconnects within that window, Nexconn pushes the messages on reconnection. Messages older than 7 days are discarded.

| Channel Type      | Offline Messages |
| ----------------- | ---------------- |
| Direct Channel    | ✓ Supported      |
| Group Channel     | ✓ Supported      |
| Community Channel | ✗ Not supported  |
| Open Channel      | ✗ Not supported  |

For a detailed explanation of offline messages vs. message history, see [Technical Practice: IM Message Data Storage Structure Design](https://mp.weixin.qq.com/s/5N2LQzqoDE3rgQ44qXvDag#at).

### Message compensation[​](#compensation "Direct link to Message compensation")

A catch-up mechanism that recovers messages a user may have missed when switching devices or reinstalling the app. On reconnection, the user receives messages sent and received on other devices since midnight of the current day.

Uses the **Message synchronization** service, which is enabled by default under **Chat** > **Chat settings** > **Multi Devices** on the [Chat settings](https://console.nexconn.ai/agile/im/service/config#Multi%20Devices) page.

### Custom messages[​](#createcustom "Direct link to Custom messages")

Application-defined message types with custom content structures. Extend `MessageContent` or `MediaMessageContent` in the SDK to define new message types.

Requirements:

* Custom message type identifiers (`objectName`) and content schemas must be **consistent across all platforms** — mismatches cause message parsing failures.
* The SDK does not define or parse custom message content; your application owns the schema.
* Use `@MessageTag` to declare the `objectName` and configure storage, display, and unread-count behavior.

### Message metadata[​](#message-ext "Direct link to Message metadata")

Key-value metadata attached to a previously sent message. Message metadata lets you annotate messages with application-defined state — reactions, read indicators, custom flags — without modifying the original message content.

* Stored as Key-Value pairs.
* Each message supports up to **300 metadata entries**.

### Message webhooks[​](#message-sync "Direct link to Message webhooks")

Webhook events that send message data from Nexconn servers to your application server. Subscribe to the `message:send` event to receive sent-message payloads from direct channels, group channels, community channels, and open channels for archiving, analytics, or downstream integrations.

### Pre-messaging webhook[​](#server-msgcb "Direct link to Pre-messaging webhook")

A pre-send interception mechanism. Messages matching your configured webhook rules — filtered by sender, receiver, channel type, or message type — are forwarded to your application server before delivery. Your server inspects the payload and returns an allow, block, or modification decision.

Use this to integrate first-party or third-party content moderation into the message delivery pipeline.

### Cloud retention[​](#server-storage "Direct link to Cloud retention")

Server-side message history. Users retrieve past messages via SDK or Server API after switching devices or clearing local storage.

Default status and retention:

| Channel Type      | Default Status | Default Retention             |
| ----------------- | -------------- | ----------------------------- |
| Direct Channel    | Enabled        | 180 days (6 months)           |
| Group Channel     | Enabled        | 180 days (6 months)           |
| System Channel    | Enabled        | 180 days (6 months)           |
| Community Channel | Enabled        | 7 days                        |
| Open Channel      | Disabled       | Configurable after activation |

To enable cloud retention for open channels, create a ticket to contact Nexconn. Extend retention for any channel type in the Console.

note

Cloud retention does not support exporting a specific user's message history. To archive messages on your own infrastructure, subscribe to [message webhooks](#message-sync).

***

## Notifications & presence[​](#notifications--presence "Direct link to Notifications & presence")

### Push[​](#push "Direct link to Push")

Remote notifications sent from the server to a device when the app is not in the foreground.

* **iOS**: Apple Push Notification service (APNs)
* **Android (global)**: Firebase Cloud Messaging (FCM)
* **Android (China and other regions)**: Huawei Push Service is supported on compatible Huawei devices. FCM is supported on devices with Google services.

### Broadcast[​](#broadcast "Direct link to Broadcast")

A Server API operation that sends a message to all users in an application. Offline recipients automatically receive the broadcast as a push notification.

### System message[​](#system-message "Direct link to System message")

A message sent by a system account — not a regular user account — to one or more users. Common uses include friend requests, account notifications, and operational announcements.

System messages are stored in [System Channels](#system). In Nexconn's data model, system messages correspond to channels with `ConversationType = SYSTEM`.

### Delivered notification[​](#message-notify "Direct link to Delivered notification")

A notification that creates a system channel message for the target user. Online users receive the message immediately; offline users receive it as a push notification when they reconnect.

Use Delivered Notifications when the notification content should persist in the user's channel history.

See also: [Undelivered Notification](#push-notify)

### Undelivered notification[​](#push-notify "Direct link to Undelivered notification")

A push-only notification that delivers directly to the device push channel — **no system channel message is created** and no channel history is stored. The notification appears as a push alert on the device.

Undelivered Notifications always route through a configured push provider: APNs, FCM, or Huawei Push Service.

Use Undelivered Notifications for transient alerts that should not appear in message history.

See also: [Delivered Notification](#message-notify)

### Online status subscription[​](#online-status "Direct link to Online status subscription")

A real-time feed of users' Nexconn SDK connection status, streamed to your application server. See [Online Status Subscription](/platform-chat-api/user/check-online-status-by-user.md) for configuration.

| Status     | Description                                   |
| ---------- | --------------------------------------------- |
| Online     | The app is connected to Nexconn servers       |
| Offline    | The app has disconnected from Nexconn servers |
| Logged out | The app has called disconnect or logout       |

***

## User controls[​](#user-controls "Direct link to User controls")

### Blocklist[​](#blacklist "Direct link to Blocklist")

Prevents specific users from sending messages in direct channels. A user added to the blocklist cannot send any messages to the blocking user.

### Allowlist[​](#whitelist "Direct link to Allowlist")

The inverse of a blocklist. When allowlists are active, only users who have mutually added each other to their allowlists can exchange messages. Suitable for applications that enforce explicit friend relationships.

### Ban user[​](#user-block "Direct link to Ban user")

Revokes a user's access to Nexconn IM services for a specified period. Banned users cannot connect to Nexconn IM servers while the ban is active.

***

## Client SDKs[​](#client-sdks "Direct link to Client SDKs")

### Chat SDK[​](#chat-sdk "Direct link to Chat SDK")

The core IM communication library with no bundled UI. Encapsulates connection management, channels, and messages. Developers implement all UI themselves.

Best suited for teams with high UI customization requirements or those building a fully custom messaging experience.

### Chat UI[​](#chat-ui "Direct link to Chat UI")

A UI layer built on top of Chat SDK. Provides production-ready components for the most common IM views:

* Channel list
* Chat windows
* Message content rendering
* Channel settings panels

Integrate these components directly to reduce implementation time. Individual components can be replaced or extended to match your design requirements.
