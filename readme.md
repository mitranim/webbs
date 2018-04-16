## TOC

* [Overview](#overview)
* [Installation](#installation)
* [API](#api)
  * [`Webbs`](#webbs)
    * [`.getState`](#webbsgetstate)
    * [`.open`](#webbsopenurl-protocol)
    * [`.close`](#webbsclose)
    * [`.send`](#webbssendmessage)
    * [`.onEachOpen`](#webbsoneachopen)
    * [`.onEachClose`](#webbsoneachclose)
    * [`.onEachError`](#webbsoneacherror)
    * [`.onEachMessage`](#webbsoneachmessage)
    * [`.deinit`](#webbsdeinit)
* [Changelog](#changelog)
* [Misc](#misc)

## Overview

Webbs is a thin abstraction over the <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket" target="_blank"> `WebSocket` </a> API available in modern browsers. It provides vital missing features: automatic reconnect with exponential backoff, and offline buffering of outgoing messages.

Small (≈ 180 LoC, 2.5 KiB minified), dependency-free, simple, hackable.

## Installation

Webbs is meant for a CommonJS-compatible bundler, such as <a href="https://webpack.github.io" target="_blank">Webpack</a> or <a href="http://browserify.org/" target="_blank">browserify</a>. Install it from <a href="https://www.npmjs.com" target="_blank">NPM</a>:

```sh
npm i -E webbs
# or
yarn add -E webbs
```

Then import:

```js
import {Webbs} from 'webbs'
```

## API

### `Webbs()`

Creates a new instance. It starts blank and inert. You must call `.open(url, protocol)` to actually open a connection.

```js
import {Webbs} from 'webbs'

const webbs = new Webbs()

webbs.onEachOpen =
webbs.onEachClose =
webbs.onEachError =
webbs.onEachMessage =
function report(event) {
  console.info('Something happened:', event)
}

webbs.open('ws://my-host:my-port', 'optional-protocol')
```

#### `webbs.getState()`

Always one of: `'CLOSED'`, `'CONNECTING'`, `'OPEN'`. Initially `'CLOSED'`.

#### `webbs.open(url, protocol)`

Opens the connection. Will automatically reconnect if disconnected. Stores `webbs.url` and `webbs.protocol` for automatic reconnects. Idempotent: has no effect if already connected.

```js
const webbs = new Webbs()
webbs.open('ws://my-host:my-port', 'optional-protocol')
```

#### `webbs.close()`

Empties the outgoing message buffer, closes the connection, and doesn't reconnect. Can be reopened later. Will trigger `onEachClose` if the underlying websocket is open.

Also aliased as [`webbs.deinit`](#webbsdeinit).

```js
webbs.close()
// some time later
webbs.open(webbs.url, webbs.protocol)
```

#### `webbs.deinit()`

Same as `.close()`. Aliased for compatibility with my other libraries, where `deinit` is the [dominant interface](https://mitranim.com/espo/#-isdeinitable-value-) for "closing" things.

#### `webbs.send(message)`

Sends `message` over the websocket, if open. The message must be compatible with `WebSocket.prototype.send` (string or blob).

If not connected, adds `message` to `webbs.outgoingBuffer`. When connected, will send all buffered messages at once.

```js
const webbs = new Webbs()

// These get buffered
webbs.send('my msg')
webbs.send(new Blob([1, 2, 3]))

// If this succeeds, the messages will be automatically sent
webbs.open('ws://my-host:my-port')
```

#### `webbs.onEachOpen`

Initially `undefined`; you can assign a function. Gets called whenever an underlying native websocket successfully connects. May be triggered multiple times over the lifetime of the `webbs` instance.

```js
webbs.onEachOpen = function report(event) {
  console.info('Socket reconnected:', event)
}
```

#### `webbs.onEachClose`

Initially `undefined`; you can assign a function. Gets called whenever an underlying native websocket closes. May be triggered multiple times over the lifetime of the `webbs` instance.

Counter-intuitively, this doesn't have symmetry with `.onEachOpen`. When reconnecting, `.onEachClose` will be called on each failed attempt.

Calling `webbs.close()` or `webbs.deinit()` _always_ triggers `onEachClose`. If the underlying websocket was open, it's triggered asynchronously and receives the relevant DOM event. If the websocket wasn't open, it's triggered _synchronously_ and receives `undefined`.

```js
webbs.onEachClose = function report(event) {
  console.warn('Socket disconnected:', event)
}
```

#### `webbs.onEachError`

Initially `undefined`; you can assign a function. Gets called whenever an underlying native websocket fails to connect or loses an active connection. May be triggered multiple times over the lifetime of the `webbs` instance.

```js
webbs.onEachError = function report(event) {
  console.warn('Socket error:', event)
}
```

#### `webbs.onEachMessage`

Initially `undefined`; you can assign a function. Gets called whenever an underlying native websocket receives a message.

```js
webbs.onEachMessage = function report(event) {
  console.info('Socket message:', event)
}
```

## Changelog

### 0.0.8

Breaking improvements and cleanup:

* moved `url` and `protocol` arguments from constructor to `.open`
* `.close` and `.deinit` are now equivalent
* added `webbs.getState`
* better ordering of state changes and callbacks; a webbs instance now reaches a consistent state before invoking the corresponding `onEach` callback
* `onEachClose` is always called on `.close`, even if there was no underlying socket
* removed `sendJson`; just define a function if you want

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
