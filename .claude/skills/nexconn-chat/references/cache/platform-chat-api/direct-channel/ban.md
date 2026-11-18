# Mute or unmute a user in direct channels

Mute or unmute a user in direct channels. A muted user cannot send direct messages from the client.

tip

The server API for sending direct messages is not affected by the mute status. A muted user can still send direct messages via the server API.

## Request[​](#request "Direct link to Request")

**POST**: `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/channel-type/mute/set`

**Rate limit**: 100 requests per second

**Authentication**: All server API requests require signature verification. See [API request signing](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

Content type: `application/json`

| Parameter      | Type       | Required | Description                                                              |
| -------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `userIds`      | `String[]` | Yes      | User IDs to mute or unmute. Max 1000 per request.                        |
| `muteState`    | `Number`   | Yes      | Mute state. `0`: unmute. `1`: mute.                                      |
| `channelTypes` | `String[]` | Yes      | Channel types. Currently supports direct channels only: `1` or `PERSON`. |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/channel-type/mute/set HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "userIds": [
      "123",
      "456"
   ],
   "muteState": 1,
   "channelType": [
      "PERSON"
   ]
}

```

## Response[​](#response "Direct link to Response")

| Field  | Type     | Description                         |
| ------ | -------- | ----------------------------------- |
| `code` | `Number` | Status code. `0` indicates success. |

## Response example[​](#response-example "Direct link to Response example")

HTTP

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
   "code": 0
}

```
