# Overview

Nexconn provides multiple content moderation options for your Chat service:

* **Built-in profanity filter**: A basic, out-of-the-box mechanism for detecting and filtering profanity in text messages. Limited to text content with a default maximum of 50 words. Not a replacement for professional content moderation.
* **Automatic moderation**: A managed review service for text, image, voice, and video messages. Identifies higher-risk content categories such as political, prohibited, sexual, violent, abusive, and advertising content.
* **Pre-messaging webhooks**: Route messages to your own server before delivery. Your server determines whether to deliver, block, or modify the message content. Use this to integrate your own moderation system or a third-party moderation service.

## Profanity filter[​](#profanity-filter "Direct link to Profanity filter")

The profanity filter is a basic protection mechanism that detects and handles profanity in text message content. You can choose to block the entire message or replace the matched words with a specified string.

Supported languages: Chinese, English, Japanese, German, Russian, Korean, Arabic.

Configure the profanity filter and manage profanity words in the Console or via the Server API:

* **Console**: Go to [**Chat** > **Chat settings** > **Security & Moderation** > **Profanity filter**](https://console.nexconn.ai/agile/im/service/config#Security%20&%20Moderation).
* **Server API**: [Batch add profanity words](/platform-chat-api/moderation/batch-add-sensitive-word.md), [remove profanity words](/platform-chat-api/moderation/remove-sensitive-word.md), and [query profanity words](/platform-chat-api/moderation/query-sensitive-word.md).

The profanity filter is built in and does not require activation. Managing profanity words is separate from enabling moderation for Server API messages. By default, moderation features evaluate messages sent from client SDKs. To also moderate messages sent through the Server API, enable **Moderate messages sent by server API** in the Console under **Chat** > **Chat settings** > **Security & Moderation**. This setting controls whether Server API messages are evaluated by configured and applicable moderation features, including the profanity filter and automatic moderation.

### Default behavior[​](#default-behavior "Direct link to Default behavior")

* Maximum of 50 profanity words by default (purchasable expansion available).
* Applies only to messages sent from client SDKs by default.
* Applies only to the built-in text message type (`RC:TxtMsg`) by default. Supports direct, group, open, and community channels.
* No notification to the sender by default.

### Profanity filter rules[​](#profanity-filter-rules "Direct link to Profanity filter rules")

* **Simplified/Traditional Chinese**: Setting a simplified Chinese word also matches its traditional Chinese equivalent.
* **Punctuation-aware**: Punctuation characters within a word are ignored. For example, the profanity word "AB" matches "A,B" and "A3B".
* **English word matching**: English words are matched as whole words. Full-width and half-width, uppercase and lowercase are matched automatically. For example, "AV" matches "AV" and "av" but does not match "Java".
* **Numeric matching**: Consecutive numeric strings are matched. Full-width digits are also matched. For example, "123" matches "123", "1 2 3", and "１２３" (full-width), but does not match "123" within "123467".

## Automatic moderation[​](#automatic-moderation "Direct link to Automatic moderation")

Automatic moderation is a managed review service that reviews messages before delivery. It identifies risky content including political, prohibited, sexual, violent or terrorist, abusive, advertising, and off-platform solicitation content.

Automatic moderation does not replace the profanity filter. The two features are independent: enabling one does not affect the other.

Supported content categories: text, image, GIF, voice, and video. Supported channel types: direct, group, open, and community channels.

Moderation decisions are made before delivery. A message can be passed, blocked (`REJECT`), or flagged for review (`REVIEW`). When a message is blocked, the sender is not notified by default.

For full setup instructions, supported scope, billing, and moderation result webhooks, see [Automatic moderation](/platform-chat-api/moderation/auto-moderation.md).

## Pre-messaging webhooks[​](#pre-messaging-webhooks "Direct link to Pre-messaging webhooks")

Use pre-messaging webhooks to integrate your own moderation system or a third-party service.

Pre-messaging webhooks route messages matching your configured rules to your server before delivery. Your server inspects the message and returns a response indicating whether to deliver, block, or modify the message.

Subscribe to the `*:pre_messaging` webhook events in the Console under **Chat** > **Webhooks**.

For details on creating routing rules and webhook parameters, see [Pre-messaging webhooks](/platform-chat-api/webhook/message/pre-messaging.md).
