/**
 * Public
 */

export class Webbs {
  constructor(url, protocol) {
    validate(url, isString)
    validate(protocol, isStringOrUndefined)
    this.url = url
    this.protocol = protocol

    this.nativeWs = null
    this.outgoingBuffer = []
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectInterval = 1000 * 60
    this.onEachOpen = null
    this.onEachClose = null
    this.onEachError = null
    this.onEachMessage = null
  }

  open() {
    if (isOpen(this.nativeWs) || isConnecting(this.nativeWs)) return
    clearNativeWs(this)
    const nativeWs = new WebSocket(this.url, this.protocol)
    nativeWs.webbs = this
    nativeWs.onopen = wsOnOpen
    nativeWs.onclose = wsOnCloseWithReconnect
    nativeWs.onerror = wsOnError
    nativeWs.onmessage = wsOnMessage
    this.nativeWs = nativeWs
  }

  close() {
    if (this.nativeWs) {
      this.nativeWs.onclose = wsOnClose
      this.nativeWs.close()
      this.nativeWs = null
    }
    unscheduleReconnect(this)
  }

  send(msg) {
    this.outgoingBuffer.push(msg)
    if (isOpen(this.nativeWs)) flushSendBuffer(this)
  }

  sendJson(msg) {
    this.send(JSON.stringify(msg))
  }

  calcReconnectInterval() {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectInterval)
  }

  deinit() {
    this.outgoingBuffer.length = 0
    this.close()
  }
}

/**
 * Internal
 */

function unscheduleReconnect(webbs) {
  clearTimeout(webbs.reconnectTimer)
  webbs.reconnectTimer = null
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
  webbs.reconnectTimer = null
  webbs.open()
}

function flushSendBuffer({nativeWs, outgoingBuffer}) {
  while (isOpen(nativeWs) && outgoingBuffer.length) {
    nativeWs.send(outgoingBuffer.shift())
  }
}

function clearNativeWs(webbs) {
  const {nativeWs} = webbs
  webbs.nativeWs = null
  if (nativeWs) {
    nativeWs.webbs = null
    nativeWs.onclose = null
    nativeWs.close()
  }
}

function wsOnOpen(event) {
  if (!this.webbs) return
  unscheduleReconnect(this.webbs)
  try {
    if (isFunction(this.webbs.onEachOpen)) this.webbs.onEachOpen(event)
  }
  finally {
    flushSendBuffer(this.webbs)
  }
}

function wsOnClose(event) {
  if (!this.webbs) return
  try {
    if (isFunction(this.webbs.onEachClose)) this.webbs.onEachClose(event)
  }
  finally {
    clearNativeWs(this.webbs)
  }
}

function wsOnCloseWithReconnect(event) {
  const {webbs} = this
  try {
    wsOnClose.call(this, event)
  }
  finally {
    if (webbs) scheduleReconnect(webbs)
  }
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
