# Getting started

Welcome to the Nexconn Chat Platform API. This guide walks you through how the API works and helps you make your first API call, so you can quickly integrate real-time messaging into your application.

With the Platform Chat API, your application server (App Server) can:

* **Manage users** — Register users to the messaging service and set user profiles.
* **Send messages** — Send direct, group, or system messages.
* **Manage groups** — Create and manage group channels and memberships.
* **Moderate content** — Apply profanity filters and content moderation to messages.
* **Subscribe to events** — Receive real-time Webhooks events for user status changes, message delivery, and more.

**Some management APIs and advanced features are only available through the Platform Chat API.** See [Endpoint list](/platform-chat-api/prepare-to-use-api/chat-server-api-list.md) for the indexed endpoint catalog, and browse the feature sections in this doc set for additional specialized APIs.

## Key concepts[​](#key-concepts "Direct link to Key concepts")

Before you start, familiarize yourself with these core concepts:

* **[API request signature](/platform-chat-api/prepare-to-use-api/auth.md)** — The security mechanism that authenticates every API request.
* **[Data format](#data-format)** — Most endpoints accept `application/x-www-form-urlencoded`; a few require `application/json`.
* **[Base URL](/platform-chat-api/prepare-to-use-api/base-url.md)** — Nexconn provides multiple data center domains for high-availability deployments.
* **[Status codes](/platform-chat-api/code.md)** — Understand response codes to quickly diagnose issues.
* **[Webhooks](/platform-chat-api/webhook/overview.md)** — Configure a single webhook endpoint to receive real-time event notifications such as user status changes, messages, and channel events.

## Architecture[​](#architecture "Direct link to Architecture")

Security warning

You **must** call all Platform Chat API endpoints from your application server. **Never** call them directly from a client app — doing so exposes your `App Secret` and creates a serious security risk.

The diagram below shows how your app (client), your server (App Server), and the Nexconn server (IM Server) interact:

1. The client sends a business request to your App Server (for example, requesting to log in to messaging).
2. Your App Server calls the Platform Chat API to obtain an access token for the user.
3. Your App Server returns the access token to the client.
4. The client uses the access token to connect to the Nexconn messaging service for real-time communication.

## Quickstart: Make your first API call[​](#quickstart-make-your-first-api-call "Direct link to Quickstart: Make your first API call")

The following example uses the [Register a user](/platform-chat-api/user/register.md) endpoint to walk you through a complete API call.

### Step 1: Prerequisites[​](#step-1-prerequisites "Direct link to Step 1: Prerequisites")

Before you begin:

* Create an app in the [Nexconn Console](https://console.nexconn.ai/agile/dashboard/workplace) and obtain your **App Key** and **App Secret**. These credentials are used to sign API requests.
* Prepare a test client to connect to the messaging service using the generated access token.
* Review the [default behaviors and configuration](/platform-chat-api/prepare-to-use-api/chat-server-api-list.md) for a smoother integration experience.

### Step 2: Build and send the request[​](#step-2-build-and-send-the-request "Direct link to Step 2: Build and send the request")

Making an API call involves three steps: prepare parameters, generate a signature, and send the request.

#### 1. Prepare request parameters[​](#1-prepare-request-parameters "Direct link to 1. Prepare request parameters")

The [Register a user](/platform-chat-api/user/register.md) endpoint requires these body parameters: `userId`, `name`, and `avatarUrl`.

All API requests must also include the following authentication headers:

* **App-Key** — Your app's App Key.
* **Nonce** — A random string, no longer than 18 characters. Use a different value for each request.
* **Timestamp** — Unix timestamp in **milliseconds** (milliseconds since January 1, 1970 00:00:00 UTC).

#### 2. Generate the signature[​](#2-generate-the-signature "Direct link to 2. Generate the signature")

The signature is the core security mechanism. Every request must be signed.

The `Signature` header value is a SHA1 hash computed from the concatenation of `App Secret` + `Nonce` + `Timestamp`.

For detailed instructions, see [API request signature](/platform-chat-api/prepare-to-use-api/auth.md).

#### 3. Send the HTTP request[​](#3-send-the-http-request "Direct link to 3. Send the HTTP request")

With all parameters ready, send the HTTP request. All requests **must** use HTTPS. All current Platform Chat API endpoints use the `POST` method.

Here is a complete HTTP request example for `POST /v4/auth/access-token/issue`:

HTTP

```http
POST /v4/auth/access-token/issue HTTP/1.1
Host: api.sg-light-api.com
App-Key: your-own-app-key
Nonce: 14314
Timestamp: 1408710653000
Signature: 30be0bbca9c9b2e27578701e9fda2358a814c88f
Content-Type: application/json

{
  "userId": "jlk456j5",
  "name": "Ironman",
  "avatarUrl": "http://abc.com/myportrait.jpg"
}

```

note

The API `Host` varies by region. To ensure high availability, implement automatic domain failover. See [Base URL](/platform-chat-api/prepare-to-use-api/base-url.md) for details.

### Step 3: Handle the response[​](#step-3-handle-the-response "Direct link to Step 3: Handle the response")

On success, the server returns `HTTP 200 OK` with a JSON response body.

A successful access token response looks like this:

JSON

```json
{
    "code": 0,
    "result": {
        "userId": "jlk456j5",
        "accessToken": "sfd9823ihufi"
    }
}

```

* **`code`** — Business return code in the JSON body. `0` indicates success. For business and HTTP status codes, see [Status codes](/platform-chat-api/code.md).
* **`result`** — Response data object. For this API, it contains the issued access token and the user ID.

## Data format[​](#data-format "Direct link to Data format")

Most newly published Platform Chat API endpoints use `application/json` request bodies.

Some compatibility endpoints still use `application/x-www-form-urlencoded`.

Always follow the method, path, and content type shown on the individual API reference page.

## Next steps[​](#next-steps "Direct link to Next steps")

You now understand the basics of making Platform Chat API calls. From here, you can:

* Browse the [Endpoint list](/platform-chat-api/prepare-to-use-api/chat-server-api-list.md) to explore all available endpoints.
* Visit the [Nexconn Console](https://console.nexconn.ai/agile/dashboard/workplace) to start building your app.
