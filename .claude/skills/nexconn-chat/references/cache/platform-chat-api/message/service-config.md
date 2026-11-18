# Service configuration

## Feature configuration[​](#feature-configuration "Direct link to Feature configuration")

The following features relate to message management and can be configured in the Nexconn console under [Chat settings](https://console.nexconn.ai/agile/im/service/config):

* **Message webhooks**: Sync message data from direct, group, community, and open channels to your app server. Subscribe to the `message:send` webhook event in the Console under **Chat** > **Webhooks**.

  <!-- -->

  * To receive community channel metadata changes, contact support.
  * To receive messages containing blocked profanity, contact support.

* **Include Server API Messaging in post-event webhooks**: When enabled, messages sent via the server API are also included in webhook delivery. Only effective when the `message:send` webhook is configured. Configure under **Chat** > **Chat settings** > **Messages**.

* **Moderate messages sent by server API**: Controls whether the profanity filter applies to messages sent via the server API. Configure under **Chat** > **Chat settings** > **Security & Moderation**.

* **Message synchronization**: Enabled by default. Syncs sent and received messages across multiple devices for the same user, including Server API messages sent while the sender's client is offline. Manage this setting under **Chat** > **Chat settings** > **Multi Devices** on the [Chat settings](https://console.nexconn.ai/agile/im/service/config#Multi%20Devices) page.

Visit the [Chat settings](https://console.nexconn.ai/agile/im/service/config) page in the console to configure these features.
