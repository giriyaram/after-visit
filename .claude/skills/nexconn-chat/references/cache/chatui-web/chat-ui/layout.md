# Layout controls

If you use the built-in `nc-chat-ui-app-provider` shell, ChatUI manages the channel bar and the detail header for you. [NCChatUIApplication](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/NCChatUIApplication.html) exposes three layout setters:

* `setChannelBarSwitch(enable: boolean)`
* `setChannelDetailBackSwitch(enable: boolean)`
* `setChannelBarTitle(value?: string)`

Unlike the pre-`ready()` customization APIs, these setters are not limited to the setup phase. You can call them before or after the UI is mounted.

## Show or hide the channel bar[​](#show-or-hide-the-channel-bar "Direct link to Show or hide the channel bar")

Use `setChannelBarSwitch` to toggle the left-side channel region in the built-in shell.

TypeScript

```ts
app.setChannelBarSwitch(false);

```

When the channel bar is hidden, ChatUI keeps the detail area mounted and stops showing the built-in list region.

## Show or hide the back button[​](#show-or-hide-the-back-button "Direct link to Show or hide the back button")

Use `setChannelDetailBackSwitch` to control the back button in the detail header.

TypeScript

```ts
app.setChannelDetailBackSwitch(true);

```

This is most useful when your app owns routing or renders its own surrounding navigation.

## Set the channel bar title[​](#set-the-channel-bar-title "Direct link to Set the channel bar title")

Use `setChannelBarTitle` to replace the built-in title text.

TypeScript

```ts
app.setChannelBarTitle('Inbox');

```

Reset to the default label with `undefined`:

TypeScript

```ts
app.setChannelBarTitle(undefined);

```

If the channel bar is hidden, `setChannelBarTitle` has no effect until you show the bar again.

tip

If you mount only child providers such as `nc-channel-list-container-provider` and `nc-channel-detail-provider`, outer page layout and routing remain your responsibility.
