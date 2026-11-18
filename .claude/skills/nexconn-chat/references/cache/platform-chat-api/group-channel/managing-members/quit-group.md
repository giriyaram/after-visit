# Remove users from a group channel

Remove one or more users from a group channel.

## Request[​](#request "Direct link to Request")

**POST:** `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/group-channel/leave`

**Rate limit:** 100 per second

**Signature:** Required. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

Content type: `application/json`

| Parameter                        | Type     | Required | Description                                                                                           |
| -------------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `channelId`                      | `String` | Yes      | Group channel ID.                                                                                     |
| `userIds`                        | `Array`  | Yes      | Array of user IDs to remove. Max 100 users per request.                                               |
| `shouldDeleteMute`               | `Number` | No       | Whether to also remove the users' mute status. `0`: Do not remove. `1`: Remove (default).             |
| `shouldDeleteAllowedSendersList` | `Number` | No       | Whether to also remove users from the mute allowlist. `0`: Do not remove. `1`: Remove (default).      |
| `shouldDeleteFavorites`          | `Number` | No       | Whether to also remove the users' followed member records. `0`: Do not remove. `1`: Remove (default). |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/group-channel/leave HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "channelId": "groupId1",
   "userIds": [
      "userId"
   ]
}

```

## Response[​](#response "Direct link to Response")

| Field  | Type     | Description                                                                         |
| ------ | -------- | ----------------------------------------------------------------------------------- |
| `code` | `Number` | Return code. `0` indicates success. See [Status codes](/platform-chat-api/code.md). |

## Response example[​](#response-example "Direct link to Response example")

HTTP

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
   "code": 0
}

```
