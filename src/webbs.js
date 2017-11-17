const {slice, reduce} = Array.prototype

/**
 * Webbs
 */

export class Webbs {
  constructor (url, protocol) {
    validate(isString, url)

    this.url = url

    // protocol must be string or undefined:
    // WebSocket(url, undefined)  ->  ok
    // WebSocket(url, null)       ->  connection error
    this.protocol = protocol

    this.que = new TaskQueAsync()
    this.nativeWS = null
    this.sendBuffer = []
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectInterval = 1000 * 60
    this.onEachOpen = null
    this.onEachClose = null
    this.onEachError = null
    this.onEachMessage = null
  }

  open () {
    this.que.push(webbsOpen.bind(this))
  }

  close () {
    this.que.push(webbsClose.bind(this))
  }

  send (msg) {
    this.que.push(webbsSend.bind(this, msg))
  }

  sendJSON (msg) {
    this.send(JSON.stringify(msg))
  }

  calcReconnectInterval () {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectInterval)
  }

  deinit () {
    this.sendBuffer.splice(0)
    this.que.deinit()
    this.close()  // goes back into que
  }
}

// Webbs privates

function webbsOpen () {
  if (isNativeWSActive(this.nativeWS)) return
  if (this.nativeWS) webbsClearNativeWs.call(this)
  this.nativeWS = assign(new WebSocket(this.url, this.protocol), {
    webbs: this,
    onopen: wsOnOpen,
    onclose: wsOnClose,
    onerror: wsOnError,
    onmessage: wsOnMessage,
  })
}

function webbsClose () {
  webbsClearNativeWs.call(this)
  webbsClearReconnect.call(this)
}

function webbsSend (msg) {
  this.sendBuffer.push(msg)
  if (isNativeWSOpen(this.nativeWS)) webbsFlushSendBuffer.call(this)
}

function webbsReconnect () {
  if (!this.reconnectTimer) {
    this.reconnectTimer = setTimeout(
      webbsAttemptReconnect.bind(this),
      this.calcReconnectInterval()
    )
    this.reconnectAttempts += 1
  }
}

function webbsAttemptReconnect () {
  clearTimeout(this.reconnectTimer)
  this.reconnectTimer = null
  this.open()
}

function webbsFlushSendBuffer () {
  while (this.nativeWS && this.sendBuffer.length) {
    this.nativeWS.send(this.sendBuffer.shift())
  }
}

function webbsClearNativeWs () {
  if (this.nativeWS) {
    this.nativeWS.onclose = null
    this.nativeWS.close()
    this.nativeWS = null
  }
}

function webbsClearReconnect () {
  clearTimeout(this.reconnectTimer)
  this.reconnectTimer = null
  this.reconnectAttempts = 0
}

// WebSocket addons and privates

function wsOnOpen (event) {
  validateSocketPair(this)
  webbsClearReconnect.call(this.webbs)
  try {
    if (isFunction(this.webbs.onEachOpen)) this.webbs.onEachOpen(event)
  } finally {
    webbsFlushSendBuffer.call(this.webbs)
  }
}

function wsOnClose (event) {
  validateSocketPair(this)
  try {
    if (isFunction(this.webbs.onEachClose)) this.webbs.onEachClose(event)
  } finally {
    webbsClearNativeWs.call(this.webbs)
    this.webbs.que.push(webbsReconnect.bind(this.webbs))
  }
}

// This fires:
// when native WS closes (nativeWS.readyState === nativeWS.CLOSED)
// when native WS fails to reconnect (nativeWS.readyState === nativeWS.CONNECTING)
function wsOnError (event) {
  validateSocketPair(this)
  if (isFunction(this.webbs.onEachError)) this.webbs.onEachError(event)
}

function wsOnMessage (event) {
  validateSocketPair(this)
  if (isFunction(this.webbs.onEachMessage)) this.webbs.onEachMessage(event)
}

/**
 * QueAsync
 */

class QueAsync {
  constructor (deque) {
    validate(isFunction, deque)
    this.deque = deque
    this.state = this.states.IDLE
    this.flushTimer = null
    this.pending = []
    this.onScheduledFlush = this.onScheduledFlush.bind(this)
  }

  dam () {
    if (this.state === this.states.IDLE) this.state = this.states.DAMMED
  }

  push (value) {
    this.pending.push(value)
    if (this.state === this.states.IDLE) this.flush()
  }

  flush () {
    if (this.state === this.states.FLUSHING) return
    this.state = this.states.FLUSHING
    this.flushTimer = setTimeout(this.onScheduledFlush)
  }

  isEmpty () {
    return !this.pending.length
  }

  onScheduledFlush () {
    this.flushTimer = null
    try {
      if (this.pending.length) this.deque(this.pending.shift())
    } finally {
      if (this.pending.length) this.flushTimer = setTimeout(this.onScheduledFlush)
      else this.state = this.states.IDLE
    }
  }

  deinit () {
    clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.pending.splice(0)
    this.state = this.states.IDLE
  }
}

QueAsync.prototype.states = {
  IDLE: 'IDLE',
  DAMMED: 'DAMMED',
  FLUSHING: 'FLUSHING',
}

/**
 * TaskQueAsync
 */

class TaskQueAsync extends QueAsync {
  constructor () {
    super(call)
  }

  push (fun) {
    validate(isFunction, fun)
    return super.push(fun.bind(this, ...slice.call(arguments, 1)))
  }
}

/**
 * Utils
 */

function isNativeWSOpen (nativeWS) {
  return nativeWS && nativeWS.readyState === nativeWS.OPEN
}

function isNativeWSActive (nativeWS) {
  return nativeWS && (
    isNativeWSOpen(nativeWS) || nativeWS.readyState === nativeWS.CONNECTING
  )
}

function validateSocketPair (nativeWS) {
  if (nativeWS.webbs.nativeWS !== nativeWS) {
    throw Error('Expected paired instances of WebSocket and Webbs')
  }
}

function assign () {
  return reduce.call(arguments, assignOne)
}

function assignOne (object, src) {
  if (src) for (const key in src) object[key] = src[key]
  return object
}

function call (fun, value) {
  return fun(value)
}

function isString (value) {
  return typeof value === 'string'
}

function isFunction (value) {
  return typeof value === 'function'
}

function validate (test, value) {
  if (!test(value)) throw Error(`Expected ${value} to satisfy test ${test.name}`)
}
