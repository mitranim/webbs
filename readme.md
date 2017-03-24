## TOC

* [Overview](#overview)
* [Installation](#installation)
* [Webbs](#webbsurl-protocol)
  * [`open`](#webbsopen)
  * [`close`](#webbsclose)
  * [`send`](#webbssendmessage)
  * [`sendJSON`](#webbssendjsonmessage)
  * [`nativeWS`](#webbsnativews)
  * [`url`](#webbsurl)
  * [`protocol`](#webbsprotocol)
  * [`onopen`](#webbsonopen)
  * [`onclose`](#webbsonclose)
  * [`onerror`](#webbsonerror)
  * [`onmessage`](#webbsonmessage)
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

## `Webbs(url, [protocol])`

Takes the same arguments as the native `WebSocket` constructor. Returns an
object that pretends to be a `WebSocket`. Starts inert; call `.open()` to
connect.

All `Webbs` methods are asynchronous unless stated otherwise.

```js
const {Webbs} = require('webbs')

const webbs = new Webbs('ws://my-host:my-port', 'optional-my-protocol')

webbs.onopen =
webbs.onclose =
webbs.onerror =
webbs.onmessage =
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

If not connected, adds `message` to `webbs.sendBuffer`. When active, will send
all buffered messages at once.

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

### `webbs.nativeWS`

When connected, holds the native websocket. Otherwise `null`.

### `webbs.url`

The `url` passed to the `Webbs` constructor. May be reassigned later.

### `webbs.protocol`

The `protocol` passed to the `Webbs` constructor. May be reassigned later.

### `webbs.onopen`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket successfully connects. May happen multiple times.

```js
webbs.onopen = function report (event) {
  console.info('Socket reconnected:', event)
}
```

### `webbs.onclose`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket closes. May happen multiple times. _Does not_ get called upon
`webbs.close()`.

```js
webbs.onclose = function report (event) {
  console.warn('Socket disconnected:', event)
}
```

### `webbs.onerror`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket fails to connect or loses an active connection. May happen
multiple times.

```js
webbs.onerror = function report (event) {
  console.warn('Socket error:', event)
}
```

### `webbs.onmessage`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket receives a message.

```js
webbs.onmessage = function report (event) {
  console.info('Socket message:', event)
}
```

## Misc

<a href="https://github.com/Mitranim/webbs" target="_blank">
  <span>Source →</span>
  <span class="fa fa-github"></span>
</a>

<a href="http://mitranim.com" target="_blank">
  <span>Author →</span>
  <span>mitranim.com</span>
</a>
