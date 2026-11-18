# Rate limits

The Platform Chat API limits the maximum request rate per account (App Key) to ensure consistent, high-quality service for all customers.

* The [Endpoint list](/platform-chat-api/prepare-to-use-api/chat-server-api-list.md) lists the specific rate limit for each endpoint. Most endpoints have a default limit of **100 requests per second**; some endpoints have different limits.

If you exceed these limits, the API returns HTTP 429 Too Many Requests.

## Known issues[​](#known-issues "Direct link to Known issues")

1. [Set message metadata](/platform-chat-api/message/set-expansion.md) and [Delete message metadata](/platform-chat-api/message/delete-expansion.md) also consume the rate quota of [Send a direct message](/platform-chat-api/message/send-private.md) (default 6,000 per minute) or [Send a group message](/platform-chat-api/message/send-group.md) (default 20 per second). Because the group message API has a low default limit of 20 per second, this issue is more likely to surface there. Avoid making rapid metadata changes immediately after sending group messages.
