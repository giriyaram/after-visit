# Unmute a group channel member

Unmute one or more members in a specified group channel.

If a user was muted across all group channels (with an empty `channelId`), pass an empty `channelId` to remove that global mute status.

## Request[​](#request "Direct link to Request")

**POST:** `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/group-channel/user/mute-list/remove`

**Rate limit:** 100 per second

**Signature:** Required. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

Content type: `application/json`

| Parameter   | Type     | Required | Description                                                                           |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------------- |
| `userIds`   | `Array`  | Yes      | User IDs to unmute. Max 20 per request.                                               |
| `channelId` | `String` | No       | Group channel ID. If empty, removes the all-group-channels mute status for the users. |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/group-channel/user/mute-list/remove HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "userIds": [
      "2582",
      "2583"
   ],
   "channelId": "16"
}

```

## Response[​](#response "Direct link to Response")

| Field  | Type     | Description                         |
| ------ | -------- | ----------------------------------- |
| `code` | `Number` | Return code. `0` indicates success. |

## Response example[​](#response-example "Direct link to Response example")

HTTP

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
   "code": 0
}

```
