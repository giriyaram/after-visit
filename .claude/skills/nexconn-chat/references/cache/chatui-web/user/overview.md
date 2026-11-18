# User overview

End users need a valid Nexconn token before the client can connect and exchange messages. Your app server obtains that token for the current App Key and returns it to the client.

## Register users[​](#register "Direct link to Register users")

Your app server exchanges a business `userId` for a Nexconn token. See the [Register user](/platform-chat-api/user/register.md) API for HTTP details.

Clients obtain tokens from your server during login, then call `NCEngine.connect` (see [Quickstart](/chatui-web/quickstart.md)). Manage keys in the [Nexconn Console](https://console.nexconn.ai).

Plan quotas and usage limits follow your Chat plan; this page does not list numeric caps.

## Deactivate users[​](#deactivate-users "Direct link to Deactivate users")

For compliance-driven account closure, use the server-side user lifecycle APIs. Data retention after deactivation follows your backend and platform policy.

## User profiles[​](#user "Direct link to User profiles")

Chat UI reads display data from [ServiceHooks](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/ServiceHooks.html) implementations (see [Hooks](/chatui-web/user/hooks.md)). If your app stores user profile data with the Chat SDK, resolve names, avatars, and custom fields through your hooks so Chat UI can render the same data.

## Related Chat SDK features[​](#related-chat-sdk-features "Direct link to Related Chat SDK features")

Use these Chat SDK features when your product stores or syncs user data through Nexconn:

| UI SDK category  | Chat SDK feature                                                                                         | Description                        |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| User information | [Get the current user's profile](/chatsdk-web/user/user_profiles.md)                                     | Get the current user's profile.    |
| User information | [Update the current user's profile](/chatsdk-web/user/user_profiles.md#update-the-current-users-profile) | Update the current user's profile. |
| User information | [Get another user's profile](/chatsdk-web/user/user_profiles.md#get-another-users-profile)               | Get another user's profile.        |
| User information | [Subscribe to online status](/chatsdk-web/user/subscribe_online.md)                                      | Subscribe to user online status.   |
| User information | [Manage friends](/chatsdk-web/user/friend-manager.md)                                                    | Manage user friends.               |

## Friend relationships[​](#friend-relationships "Direct link to Friend relationships")

Friend graphs can live in your services or in Chat SDK friendship APIs. If ChatUI needs friend-aware display or actions, expose that state through your application layer and hooks.
