# Add to allowed senders list

Add one or more members to the allowed senders list of a specified group channel.

* Members on the allowed senders list can send messages via the client SDK even when the group channel is frozen.
* The allowed sender status persists if the user leaves and rejoins the group.
* The allowed sender status persists even if the group channel is dissolved and recreated.

important

Individual mute has higher priority than the allowed senders list. If a user is individually muted, they cannot send messages even if they are on the allowed senders list.

## Request[​](#request "Direct link to Request")

**POST:** `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/group-channel/allowed-sender-list/add`

**Rate limit:** 100 per second

**Signature:** Required. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

Content type: `application/json`

| Parameter   | Type     | Required | Description                           |
| ----------- | -------- | -------- | ------------------------------------- |
| `userIds`   | `Array`  | Yes      | User IDs to add. Max 100 per request. |
| `channelId` | `String` | Yes      | The group channel ID.                 |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/group-channel/allowed-sender-list/add HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "channelId": "abcdefg",
   "userIds": [
      "userId_001",
      "userId_002"
   ]
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
