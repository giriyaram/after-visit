# Unban a user

Unban one or more app users.

After unbanning, users can reconnect to the messaging service, send and receive messages normally, and receive offline messages from the ban period upon reconnection. Offline messages are stored for up to 7 days — messages older than 7 days are discarded.

## Request method[​](#request-method "Direct link to Request method")

**POST**: `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/user/unban`

**Rate limit**: 100 requests per second

**Signature required**: All server API requests require signature verification. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

The request body is in `application/json` format and supports the following parameters:

| Parameter | Type       | Required | Description                                |
| --------- | ---------- | -------- | ------------------------------------------ |
| `userIds` | `String[]` | Yes      | User IDs to unban. Maximum 20 per request. |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/user/unban HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "userIds": [
      "jlk456j5",
      "jlk45211"
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
