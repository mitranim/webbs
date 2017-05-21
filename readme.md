## TOC

* [Overview](#overview)
* [Installation](#installation)
* [Webbs](#webbsurl-protocol)
  * [`open`](#webbsopen)
  * [`close`](#webbsclose)
  * [`send`](#webbssendmessage)
  * [`sendJSON`](#webbssendjsonmessage)
  * [`url`](#webbsurl)
  * [`protocol`](#webbsprotocol)
  * [`nativeWS`](#webbsnativews)
  * [`onEachOpen`](#webbsoneachopen)
  * [`onEachClose`](#webbsoneachclose)
  * [`onEachError`](#webbsoneacherror)
  * [`onEachMessage`](#webbsoneachmessage)
  * [`deinit`](#webbsdeinit)
* [Misc](#misc)

## Overview

Webbs is a JavaScript library, a thin abstraction over the
<a href="https://developer.mozilla.org/en-US/docs/Web/API/WebSocket" target="_blank">
  `WebSocket`
</a>
API available in modern browsers. It provides vital features missing from
`WebSocket`: automatic reconnect with exponential backoff, and offline
buffering of outgoing messages.

It's light, relatively simple, and hackable.

## Installation

Webbs is meant for a CommonJS-compatible bundler, such as
<a href="https://webpack.github.io" target="_blank">Webpack</a>
or
<a href="http://browserify.org/" target="_blank">browserify</a>. Install it
from
<a href="https://www.npmjs.com" target="_blank">NPM</a>:

```sh
npm i --save-dev webbs
```

Then import:

```js
const {Webbs} = require('webbs')
```

## `Webbs(url, protocol)`

Takes the same arguments as the native `WebSocket` constructor (`protocol` is
optional). Starts inert; call `.open()` to connect.

All `Webbs` methods are asynchronous unless stated otherwise.

```js
const {Webbs} = require('webbs')

const webbs = new Webbs('ws://my-host:my-port', 'optional-my-protocol')

webbs.onEachOpen =
webbs.onEachClose =
webbs.onEachError =
webbs.onEachMessage =
function report (event) {
  console.info('Something happened:', event)
}

webbs.open()
```

### `webbs.open()`

Opens or reopens a connection with the current `webbs.url` and
`webbs.protocol`. Has no effect if already connected.

```js
const webbs = new Webbs('ws://my-host:my-port', 'optional-my-protocol')
webbs.open()
```

### `webbs.close()`

Closes the active connection, if any. Stops reconnecting if a reconnect was in
progress. Can be reopened later.

```js
webbs.close()
// some time later
webbs.open()
```

### `webbs.send(message)`

Sends `message` as-is over the websocket, if any. The message should belong to
one of the types accepted by `WebSocket.send` (string, binary, or blob).

If not connected, adds `message` to `webbs.sendBuffer`. When connected, will
send all buffered messages at once.

```js
const webbs = new Webbs('ws://my-host:my-port')

// These get buffered
webbs.send('my msg')
webbs.send(new Blob([1, 2, 3]))

// If this succeeds, the messages will be automatically sent
webbs.open()
```

### `webbs.sendJSON(message)`

Same as `webbs.send(JSON.stringify(message))`. May produce a synchronous
exception if `message` is not encodable. Feel free to override this with a
custom function.

### `webbs.url`

The `url` passed to the `Webbs` constructor. May be reassigned later.

### `webbs.protocol`

The `protocol` passed to the `Webbs` constructor. May be reassigned later.

### `webbs.nativeWS`

When connected, holds the native websocket. Otherwise `null`.

### `webbs.onEachOpen`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket successfully connects. May happen multiple times.

```js
webbs.onEachOpen = function report (event) {
  console.info('Socket reconnected:', event)
}
```

### `webbs.onEachClose`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket closes. May happen multiple times.

Counter-intuitively, this doesn't have symmetry with `.onEachOpen`. When
reconnecting, `.onEachClose` will be called on each failed attempt.
It also doesn't get called upon `webbs.close()`.

```js
webbs.onEachClose = function report (event) {
  console.warn('Socket disconnected:', event)
}
```

### `webbs.onEachError`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket fails to connect or loses an active connection. May happen
multiple times.

```js
webbs.onEachError = function report (event) {
  console.warn('Socket error:', event)
}
```

### `webbs.onEachMessage`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket receives a message.

```js
webbs.onEachMessage = function report (event) {
  console.info('Socket message:', event)
}
```

### `webbs.deinit()`

Same as `.close()` but also empties the outgoing message buffer. Call this when
disposing of the Webbs instance.

## Misc

Nelo Mitranim: https://mitranim.com
