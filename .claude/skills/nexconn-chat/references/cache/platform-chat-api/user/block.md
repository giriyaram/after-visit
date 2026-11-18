# Ban a user

Ban app users, typically used for policy violations.

* A ban duration must be specified in minutes. Maximum 30 days (43,200 minutes).
* Permanent bans are not supported.
* Bans are automatically lifted when the duration expires. You can also manually unban users.

Banning takes effect immediately:

* If the user is currently connected to the messaging service, the connection is immediately terminated.
* The banned user cannot establish an IM connection or actively use IM services.
* Other users can still send messages to the banned user, but the banned user cannot receive messages or push notifications. After unbanning, the user can reconnect and receive offline messages from the ban period. Note that offline messages are stored for up to 7 days — messages older than 7 days are discarded.

## Request method[​](#request-method "Direct link to Request method")

**POST**: `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/user/ban`

**Rate limit**: 100 requests per second

**Signature required**: All server API requests require signature verification. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

The request body is in `application/json` format and supports the following parameters:

| Parameter         | Type       | Required | Description                                         |
| ----------------- | ---------- | -------- | --------------------------------------------------- |
| `userIds`         | `String[]` | Yes      | User IDs to ban. Maximum 20 per request.            |
| `durationMinutes` | `Number`   | Yes      | Ban duration in minutes. Maximum `43200` (30 days). |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/user/ban HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "userIds": [
      "BWSZNmXBD",
      "jlk456j5"
   ],
   "durationMinutes": 10
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
