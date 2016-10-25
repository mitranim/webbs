## TOC

* [Overview](#overview)
* [Installation](#installation)
* [Ws](#wsurl-protocol)
  * [`open`](#wsopen)
  * [`close`](#wsclose)
  * [`send`](#wssendmessage)
  * [`sendJSON`](#wssendjsonmessage)
  * [`nativeWs`](#wsnativews)
  * [`url`](#wsurl)
  * [`protocol`](#wsprotocol)
  * [`onopen`](#wsonopen)
  * [`onclose`](#wsonclose)
  * [`onerror`](#wsonerror)
  * [`onmessage`](#wsonmessage)
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
const {Ws} = require('webbs')
```

## `Ws(url, [protocol])`

Takes the same arguments as the native `WebSocket` constructor. Returns an
object that pretends to be a `WebSocket`. Starts inert; call `.open()` to
connect.

All `Ws` methods are asynchronous unless stated otherwise.

```js
const {Ws} = require('webbs')

const ws = Ws('ws://my-host:my-port', 'optional-my-protocol')

ws.onopen = ws.onclose = ws.onerror = ws.onmessage = function report (event) {
  console.info('Something happened:', event)
}

ws.open()
```

### `Ws.open()`

Opens or reopens a connection with the current `ws.url` and `ws.protocol`. Has
no effect if already connected.

```js
const ws = Ws('ws://my-host:my-port', 'optional-my-protocol')
ws.open()
```

### `Ws.close()`

Closes the active connection, if any. Stops reconnecting if a reconnect was in
progress. Can be reopened later.

```js
ws.close()
// some time later
ws.open()
```

### `Ws.send(message)`

Sends `message` as-is over the websocket, if any. The message should belong to
one of the types accepted by `WebSocket.send` (string, binary, or blob).

If inactive, adds `message` to `ws.sendBuffer`. When online, sends all buffered
messages at once.

```js
const ws = Ws('ws://my-host:my-port')

// These get buffered
ws.send('my msg')
ws.send(new Blob([1,2,3]))

// If this succeeds, the messages will be automatically sent
ws.open()
```

### `Ws.sendJSON(message)`

Same as `ws.send(JSON.stringify(message))`. May produce a synchronous exception
if `message` is not encodable. Feel free to override this with a custom function.

### `Ws.nativeWs`

If active, holds the native websocket. Otherwise `null`.

### `Ws.url`

The `url` passed to the `Ws` constructor. May be reassigned later.

### `Ws.protocol`

The `protocol` passed to the `Ws` constructor. May be reassigned later.

### `Ws.onopen`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket successfully connects. May happen multiple times.

```js
ws.onopen = function report (event) {
  console.info('Socket reconnected:', event)
}
```

### `Ws.onclose`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket closes. May happen multiple times. _Does not_ get called upon
`ws.close()`.

```js
ws.onclose = function report (event) {
  console.warn('Socket disconnected:', event)
}
```

### `Ws.onerror`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket fails to connect or loses an active connection. May happen
multiple times.

```js
ws.onerror = function report (event) {
  console.warn('Socket error:', event)
}
```

### `Ws.onmessage`

Initially `null`; you can assign a function. Gets called whenever an underlying
native websocket receives a message.

```js
ws.onmessage = function report (event) {
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
