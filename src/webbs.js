/**
 * Public
 */

export class Webbs {
  constructor() {
    this.url = undefined
    this.protocol = undefined
    this.nativeWs = undefined
    this.outgoingBuffer = []
    this.reconnectTimer = undefined
    this.reconnectAttempts = 0
    this.maxReconnectInterval = 1000 * 60
    this.onEachOpen = undefined
    this.onEachClose = undefined
    this.onEachError = undefined
    this.onEachMessage = undefined
  }

  // `onEachOpen`    -> 'OPEN'
  // `onEachMessage` -> 'OPEN'
  // `onEachError`   -> 'CLOSED'
  // `onEachClose`   -> 'CLOSED' | 'CONNECTING'
  getState() {
    return isOpen(this.nativeWs)
      ? 'OPEN'
      : isConnecting(this.nativeWs) || this.reconnectTimer
      ? 'CONNECTING'
      : 'CLOSED'
  }

  open(url, protocol) {
    validate(url, isString)
    validate(protocol, isStringOrUndefined)

    if (isOpen(this.nativeWs) || isConnecting(this.nativeWs)) return

    this.url = url
    this.protocol = protocol

    clearNativeWs(this)
    const nativeWs = new WebSocket(this.url, this.protocol)
    this.nativeWs = nativeWs
    nativeWs.webbs = this
    nativeWs.onopen = wsOnOpen
    nativeWs.onclose = wsOnCloseWithReconnect
    nativeWs.onerror = wsOnError
    nativeWs.onmessage = wsOnMessage
  }

  close() {
    this.outgoingBuffer.length = 0
    unscheduleReconnect(this)
    const wasOpen = isOpen(this.nativeWs)
    if (this.nativeWs) {
      this.nativeWs.onclose = wsOnClose
      this.nativeWs.close()
      this.nativeWs = undefined
    }
    if (!wasOpen && isFunction(this.onEachClose)) {
      this.onEachClose()
    }
  }

  send(msg) {
    this.outgoingBuffer.push(msg)
    if (isOpen(this.nativeWs)) flushSendBuffer(this)
  }

  calcReconnectInterval() {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectInterval)
  }

  deinit() {
    this.close()
  }
}

/**
 * Internal
 */

function unscheduleReconnect(webbs) {
  clearTimeout(webbs.reconnectTimer)
  webbs.reconnectTimer = undefined
  webbs.reconnectAttempts = 0
}

function scheduleReconnect(webbs) {
  if (!webbs.reconnectTimer) {
    const fun = scheduledReconnect.bind(undefined, webbs)
    const interval = webbs.calcReconnectInterval()
    webbs.reconnectTimer = setTimeout(fun, interval)
    webbs.reconnectAttempts += 1
  }
}

function scheduledReconnect(webbs) {
  clearTimeout(webbs.reconnectTimer)
  webbs.reconnectTimer = undefined
  webbs.open(webbs.url, webbs.protocol)
}

function flushSendBuffer({nativeWs, outgoingBuffer}) {
  while (isOpen(nativeWs) && outgoingBuffer.length) {
    nativeWs.send(outgoingBuffer.shift())
  }
}

function clearNativeWs(webbs) {
  const {nativeWs} = webbs
  webbs.nativeWs = undefined
  if (nativeWs) {
    nativeWs.webbs = undefined
    nativeWs.onclose = undefined
    nativeWs.close()
  }
}

function wsOnOpen(event) {
  if (!this.webbs) return
  unscheduleReconnect(this.webbs)
  if (isFunction(this.webbs.onEachOpen)) this.webbs.onEachOpen(event)
  flushSendBuffer(this.webbs)
}

function wsOnClose(event) {
  const {webbs} = this
  if (!webbs) return
  clearNativeWs(webbs)
  if (isFunction(webbs.onEachClose)) webbs.onEachClose(event)
}

function wsOnCloseWithReconnect(event) {
  const {webbs} = this
  if (!webbs) return
  clearNativeWs(webbs)
  scheduleReconnect(webbs)
  if (isFunction(webbs.onEachClose)) webbs.onEachClose(event)
}

// Triggered when:
//   * WS fails to open (nativeWs.readyState === nativeWs.CONNECTING)
//   * WS closes for external reasons (nativeWs.readyState === nativeWs.CLOSED)
// This is NOT triggered by `WebSocket.prototype.close`.
function wsOnError(event) {
  if (!this.webbs) return
  if (isFunction(this.webbs.onEachError)) this.webbs.onEachError(event)
}

function wsOnMessage(event) {
  if (!this.webbs) return
  if (isFunction(this.webbs.onEachMessage)) this.webbs.onEachMessage(event)
}

function isOpen(nativeWs) {
  return Boolean(nativeWs) && nativeWs.readyState === nativeWs.OPEN
}

function isConnecting(nativeWs) {
  return Boolean(nativeWs) && nativeWs.readyState === nativeWs.CONNECTING
}

function isString(value) {
  return typeof value === 'string'
}

function isStringOrUndefined(value) {
  return isString(value) || value === undefined
}

function isFunction(value) {
  return typeof value === 'function'
}

function validate(value, test) {
  if (!test(value)) throw Error(`Expected ${value} to satisfy test ${test.name}`)
}
