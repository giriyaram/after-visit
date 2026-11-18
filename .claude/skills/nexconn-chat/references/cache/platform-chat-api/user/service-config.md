# User service configuration

## New users receiving pre-registration broadcast messages[​](#new-users-receiving-pre-registration-broadcast-messages "Direct link to New users receiving pre-registration broadcast messages")

By default, newly registered users can receive broadcast messages sent within the 7 days before their registration. You can disable this on the console [Chat settings](https://console.nexconn.ai/agile/im/service/config) page.

The **New users receive pre-registration broadcast messages** toggle affects messages sent via:

* [Broadcast to all users](/platform-chat-api/message/system/send-message-broadcast-to-all.md): `/v4/system-channel/message/broadcast-all`
* [Push by user tag](/platform-chat-api/message/system/send-push-by-tag.md): `/v4/system-channel/tagged-users/send`
* [Push by app package](/platform-chat-api/message/system/send-push-by-package.md): `/v4/system-channel/app-package-users/send`

## Subscribe to user online status[​](#subscribe-to-user-online-status "Direct link to Subscribe to user online status")

Subscribe to the `user:connection_status` webhook event in the Console under **Chat** > **Webhooks**. If your network has IP access restrictions, see the [Webhooks IP allowlist](/platform-chat-api/webhook/overview.md#ip-allowlist) to configure your allowlist.

Related docs:

* [Subscribe to User Online Status](/platform-chat-api/webhook/user/connection-status.md): Webhooks event reference for receiving real-time user status change notifications.
