# Multi-device login

**Multi-device login** allows the same user account to connect to the Nexconn Chat service from multiple platforms simultaneously. This feature is supported by default and requires no additional setup.

* Console UI
* AI with MCP

The [Message synchronization](https://console.nexconn.ai/agile/im/service/config#Multi%20Devices) service is enabled by default. Messages are automatically synchronized across devices. For example, if a user is logged in on both Web and mobile, receiving a message on Web also delivers it to mobile.

If you've configured the [nexconn-console MCP server](/chatsdk-web/build-with-ai/configure-mcp-server.md), ask your AI coding assistant:

> Check the message synchronization status for my Nexconn app

The AI will use the appropriate MCP tool to check this setting. Message synchronization is enabled by default.

## Multi-device login limits[​](#multi-device-login-limits "Direct link to Multi-device login limits")

By default, the same user account can be online on one device per platform category.

| Platform category | Default limit                                                                                                                                                     | Supported SDK platforms |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Mobile            | One mobile device. To support multiple mobile devices, [submit a ticket](https://console.nexconn.ai/agile/formwork/ticket/create) for details.                    | Android, iOS, Flutter   |
| Web               | With **Message synchronization** enabled by default, a single user can maintain up to 10 simultaneous Web connections. Each browser tab counts as one connection. | Web                     |
