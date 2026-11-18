# Mute a group channel member

Mute one or more members in a specified group channel. Key behaviors:

* Mute one or more users in a specified group channel.
* If `channelId` is empty, the users are muted across **all group channels they belong to**. Up to 100 users can be set in this state. Use [List muted members](/platform-chat-api/group-channel/mute/query-gagged-user.md) with an empty `channelId` to check the current count.
* Supports fixed-duration mute (max 43,200 minutes) or permanent mute.
* Mute takes effect immediately. Muted members can still receive and read messages, but cannot send messages via the client SDK.

Mute data persists when a user leaves a group:

* A permanently muted user who leaves and rejoins the group remains muted.
* A user muted for a fixed duration who leaves and rejoins within the mute period remains muted.

tip

Messages sent via the Platform Chat API are not affected by the mute. Muted users can still send messages through the server API. See [Send a group channel message](/platform-chat-api/message/send-group.md).

## Request[​](#request "Direct link to Request")

**POST:** `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/group-channel/user/mute-list/add`

**Rate limit:** 100 per second

**Signature:** Required. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

Content type: `application/json`

| Parameter         | Type     | Required | Description                                                                               |
| ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------- |
| `userIds`         | `Array`  | Yes      | User IDs to mute. Max 20 per request.                                                     |
| `channelId`       | `String` | No       | Group channel ID. If empty, the users are muted across all group channels they belong to. |
| `durationMinutes` | `Number` | Yes      | Mute duration in minutes. Maximum: 43,200. Pass `0` for permanent mute.                   |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/group-channel/user/mute-list/add HTTP/1.1
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
   "channelId": "16",
   "durationMinutes": 1
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
