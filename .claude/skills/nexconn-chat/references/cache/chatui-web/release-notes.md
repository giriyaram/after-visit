# Release notes

## v26.2.5[​](#v2625 "Direct link to v26.2.5")

Release date: 2026-08-05

### Open source[​](#open-source "Direct link to Open source")

* ChatUI SDK for Web is now open source. View the source code on [GitHub](https://github.com/NexconnAI-Dev/nexconn-chatui-web).

### Bug fixes[​](#bug-fixes "Direct link to Bug fixes")

* Fixed an issue where pressing Enter while using an input method editor (IME) could send a message before text composition was complete.
* Fixed an issue where the HTML5 (H5) channel detail view might not display the current connection status when first opened.

## v26.2.4[​](#v2624 "Direct link to v26.2.4")

Release date: 2026-07-01

### New features[​](#new-features "Direct link to New features")

* Added events for message input focus, blur, and content changes: `MESSAGE_INPUT_FOCUS`, `MESSAGE_INPUT_BLUR`, and `MESSAGE_INPUT_CHANGE`.
* Added the `MESSAGE_WILL_SEND` event, which allows apps to modify `SendMessageParams` synchronously before ChatUI creates and sends the local message.
* Exported the related public types: `MessageInputEventData`, `MessageInputFocusEvent`, `MessageInputBlurEvent`, `MessageInputChangeEvent`, `MessageWillSendEventData`, and `MessageWillSendEvent`.

## v26.2.2[​](#v2622 "Direct link to v26.2.2")

Release date: 2026-05-28

### Bug fixes[​](#bug-fixes-1 "Direct link to Bug fixes")

* Fixed incorrect type exports for the `ChannelsMenuID` and `MessageMenuID` enums.
* Fixed an issue that prevented the `nc-combine-message` component from rendering multiline text correctly.
* Fixed an issue where the combined forwarding details pop-up could display incorrectly when forwarding a large number of messages.

## v26.2.1[​](#v2621 "Direct link to v26.2.1")

Release date: 2026-04-30

**Initial release of ChatUI SDK for Web.**

### New features[​](#new-features-1 "Direct link to New features")

* Added a Web Components-based UI for channel lists, channel details, message lists, input areas, emoji, channel menus, message menus, and message bubbles.
* Added support for direct, group, and system channels. The built-in UI displays system channels as read-only.
* Added support for text, images, GIFs, short videos, files, quoted replies, message forwarding and deletion, pinned messages, do-not-disturb settings, unread counts, read receipts, typing indicators, and group @mentions.
* Added `NCChatUIApplication` as the unified entry point for initialization, connection, UI mounting, opening channels, event handling, and ChatUI customization.
* Added service hooks for user profiles, group profiles, system channel profiles, and group member data.
* Added support for React, Vue, and other frameworks through Web Components and package manager integration.

### Customization and configuration[​](#customization-and-configuration "Direct link to Customization and configuration")

* Standardized public terminology for channels, channel models, and `NCChatUIApplication`.
* Added built-in handling for channel list rendering, channel detail layout, input menu configuration, message menu customization, emoji configuration, localization, and push notification hooks.
* Added APIs for customizing channel list items, message bubbles, input toolbar entries, channel context menus, and message context menus.
