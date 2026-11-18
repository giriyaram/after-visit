# Expire access tokens

Invalidate all access tokens obtained by specified users before a given point in time.

A single user ID can obtain multiple tokens. All valid tokens can be used simultaneously for connections. Use this API to invalidate all of a user's tokens based on your business needs. Expiring tokens does not affect existing connections established with those tokens.

* If the client reconnects (including automatic reconnection on weak networks), a token expiration error is returned. The app should obtain a new token.
* If an app user attempts to connect with an expired token, a token expiration error is returned. The app should obtain a new token.

## Token validity period[​](#token-validity-period "Direct link to Token validity period")

Tokens are valid indefinitely by default. You can modify the validity period in the console.

## Request method[​](#request-method "Direct link to Request method")

**POST**: `https://`[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)`/v4/auth/access-token/expire`

**Rate limit**: 100 requests per second

**Signature required**: All server API requests require signature verification. See [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

## Request body[​](#request-body "Direct link to Request body")

The request body is in `application/json` format and supports the following parameters:

| Parameter   | Type     | Required | Description                                                                                                                                                                                                                           |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userIds`   | `String` | Yes      | User IDs whose tokens should be expired. Maximum 20 per request.                                                                                                                                                                      |
| `expiresAt` | `Number` | Yes      | Expiration timestamp in milliseconds. All tokens obtained before this timestamp become invalid. Users connected with tokens obtained before this timestamp are not disconnected immediately but cannot reconnect after disconnection. |

## Request example[​](#request-example "Direct link to Request example")

HTTP

```http
POST /v4/auth/access-token/expire HTTP/1.1
Host: api.sg-light-api.com
App-Key: uwd1c0sxdlx2
Nonce: 14314
Timestamp: 1408710653491
Signature: 45beb7cc7307889a8e711219a47b7cf6a5b000e8
Content-Type: application/json

{
   "userIds": [
      "test1",
      "test2"
   ],
   "expiresAt": 1615362955344
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
