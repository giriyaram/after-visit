# Input toolbar

The input area includes a toolbar for sending more than plain text. By default, ChatUI uses a flat `items` array with emoji, images, files, and a conditional photo button.

![](/assets/images/editor-input-menu-347b4caa2aae9d4658dd455a7aa2a757.png)

tip

Reference artwork only. Channel filters, header extensions, and similar product features are implemented by your app.

## Practical limits[​](#practical-limits "Direct link to Practical limits")

Use these as practical size references; **actual limits still depend on the SDK build and browser**:

* Single image or file: on the order of 100 MB, bounded by the browser and OS file picker.
* Very large GIFs may be sent as a normal file or image message.
* Short video duration and resolution depend on the SDK build and browser.

## Built-in item IDs[​](#built-in-item-ids "Direct link to Built-in item IDs")

Built-in IDs are defined by [InputMenumID](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/InputMenumID.html):

| ID                    | Description                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `InputMenumID.EMOJI`  | Opens the emoji panel.                                                                                                                 |
| `InputMenumID.PLUS`   | Optional "plus" item you can use in your own custom menu tree. The default menu does not add it automatically.                         |
| `InputMenumID.IMAGES` | Pick images from the gallery.                                                                                                          |
| `InputMenumID.FILES`  | Pick local files.                                                                                                                      |
| `InputMenumID.PHOTO`  | Open the camera for a still photo. The built-in filter shows it only on `https:`, `file:`, or `localhost`, and not on mobile browsers. |

The default order is:

* `EMOJI`
* `IMAGES`
* `FILES`
* `PHOTO` when its built-in filter passes

If your product wants a secondary menu, add your own `InputMenumID.PLUS` item and place nested `submenu` entries under it.

![](/assets/images/editor-input-secondary-menu-dfa91c7b44b488d3a6556f52fa563d50.png)

tip

Reference artwork. Inspect `cloneInputMenu()` output for the authoritative tree.

## Configuration shape[​](#configuration-shape "Direct link to Configuration shape")

The toolbar is described by [InputMenu](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/InputMenu.html), which has a single `items` array of [InputMenumItem](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/InputMenumItem.html).

Each [InputMenumItem](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/InputMenumItem.html) field:

| Property             | Description                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                 | Item id; used in click events and i18n keys.                                                                |
| `order`              | Sort order among siblings; lower values come first.                                                         |
| `icon` / `hoverIcon` | Icon URLs.                                                                                                  |
| `submenu`            | Optional nested items; when present, tapping opens the submenu instead of firing a send action immediately. |
| `filter`             | Optional `(channelModel: ChatUIChannelModel) => boolean` to hide items per channel.                         |

## Read and write[​](#read-and-write "Direct link to Read and write")

Use `cloneInputMenu`, mutate the result, then call `setInputMenu` before `app.ready()`.

TypeScript

```ts
import { InputMenumID, type InputMenu } from '@nexconn/chatui';

const menu: InputMenu = app.cloneInputMenu();
menu.items.push({
  id: InputMenumID.PLUS,
  order: 10,
  icon: 'https://example.com/plus.svg',
  submenu: [
    {
      id: 'input.menu.item.location',
      order: 0,
      icon: 'https://example.com/location.svg',
    },
  ],
});
app.setInputMenu(menu);

```

## Custom items and clicks[​](#custom-items-and-clicks "Direct link to Custom items and clicks")

Pick string ids that **do not collide** with [InputMenumID](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/InputMenumID.html). If an item needs visible labels (for example inside your own secondary menu), add keys on the [Localization](/chatui-web/localization.md) page.

Custom item taps emit [ChatUIEvents](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/enums/ChatUIEvents.html) `INPUT_MENU_ITEM_CLICK` with [InputMenuItemClick](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/InputMenuItemClick.html) (`id` and current [ChatUIChannelModel](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/classes/ChatUIChannelModel.html)).

TypeScript

```ts
import { ChatUIEvents } from '@nexconn/chatui';

app.addEventListener(ChatUIEvents.INPUT_MENU_ITEM_CLICK, (evt) => {
  const { id, channelModel } = evt.data;
  if (id === 'input.menu.my.item') {
    // Your logic
  }
});

```

tip

Built-in send actions are handled by the SDK and usually **do not** emit `INPUT_MENU_ITEM_CLICK`; use the event for your own extensions.

## Message input events[​](#message-input-events "Direct link to Message input events")

Since `26.2.4`, the built-in message editor emits focus, blur, and user-input change events. Use them when your app needs to track editor state outside the ChatUI component, such as analytics, draft indicators, or contextual shortcuts.

TypeScript

```ts
import { ChatUIEvents } from '@nexconn/chatui';

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_FOCUS, (evt) => {
  console.log('editor focused:', evt.data.value);
});

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_BLUR, (evt) => {
  console.log('editor blurred:', evt.data.value);
});

app.addEventListener(ChatUIEvents.MESSAGE_INPUT_CHANGE, (evt) => {
  console.log('editor changed:', evt.data.value);
});

```

Each event carries [MessageInputEventData](https://docs.nexconn.ai/apidoc/nexconnchatui-web/latest/en_US/interfaces/MessageInputEventData.html), currently `{ value: string }`.

tip

`MESSAGE_INPUT_CHANGE` represents user input. SDK-internal changes such as draft restoration or programmatic content updates are not guaranteed to emit it.
