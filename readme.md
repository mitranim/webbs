## TOC

* [Overview](#overview)
* [Installation](#installation)
* [Wsocket](#wsocketurl-protocol)
  * [`open`](#wsocketopen)
  * [`close`](#wsocketclose)
  * [`send`](#wsocketsendmessage)
  * [`sendJSON`](#wsocketsendjsonmessage)
  * [`nativeWsocket`](#wsocketnativewsocket)
  * [`url`](#wsocketurl)
  * [`protocol`](#wsocketprotocol)
  * [`onopen`](#wsocketonopen)
  * [`onclose`](#wsocketonclose)
  * [`onerror`](#wsocketonerror)
  * [`onmessage`](#wsocketonmessage)
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
const {Wsocket} = require('webbs')
```

## `Wsocket(url, [protocol])`

Takes the same arguments as the native `WebSocket` constructor. Returns an
object that pretends to be a `WebSocket`. Starts inert; call `.open()` to
connect.

All `Wsocket` methods are asynchronous unless stated otherwise.

```js
const {Wsocket} = require('webbs')

const wsocket = Wsocket('ws://my-host:my-port', 'optional-my-protocol')

wsocket.onopen =
wsocket.onclose =
wsocket.onerror =
wsocket.onmessage =
function report (event) {
  console.info('Something happened:', event)
}

wsocket.open()
```

### `wsocket.open()`

Opens or reopens a connection with the current `wsocket.url` and
`wsocket.protocol`. Has no effect if already connected.

```js
const wsocket = Wsocket('ws://my-host:my-port', 'optional-my-protocol')
wsocket.open()
```

### `wsocket.close()`

Closes the active connection, if any. Stops reconnecting if a reconnect was in
progress. Can be reopened later.

```js
wsocket.close()
// some time later
wsocket.open()
```

### `wsocket.send(message)`

Sends `message` as-is over the websocket, if any. The message should belong to
one of the types accepted by `WebSocket.send` (string, binary, or blob).

If inactive, adds `message` to `wsocket.sendBuffer`. When active, will send all
buffered messages at once.

```js
const wsocket = Wsocket('ws://my-host:my-port')

// These get buffered
wsocket.send('my msg')
wsocket.send(new Blob([1, 2, 3]))

// If this succeeds, the messages will be automatically sent
wsocket.open()
```

### `wsocket.sendJSON(message)`

Same as `wsocket.send(JSON.stringify(message))`. May produce a synchronous
exception if `message` is not encodable. Feel free to override this with a
custom function.

### `wsocket.nativeWsocket`

If active, holds the native websocket. Otherwise `null`.

### `wsocket.url`

The `url` passed to the `Ws` constructor. May be reassigned later.

### `wsocket.protocol`

The `protocol` passed to the `Ws` constructor. May be reassigned later.

### `wsocket.onopen`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket successfully connects. May happen multiple times.

```js
wsocket.onopen = function report (event) {
  console.info('Socket reconnected:', event)
}
```

### `wsocket.onclose`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket closes. May happen multiple times. _Does not_ get called upon
`wsocket.close()`.

```js
wsocket.onclose = function report (event) {
  console.warn('Socket disconnected:', event)
}
```

### `wsocket.onerror`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket fails to connect or loses an active connection. May happen
multiple times.

```js
wsocket.onerror = function report (event) {
  console.warn('Socket error:', event)
}
```

### `wsocket.onmessage`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket receives a message.

```js
wsocket.onmessage = function report (event) {
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
