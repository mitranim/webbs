'use strict'

const {call, slice, includes, isFunction, isString, validate} = require('fpx')
const {isImplementation, assign, bindAll, pull} = require('espo')

/**
 * Wsocket
 */

exports.Wsocket = Wsocket
function Wsocket (url, protocol) {
  if (!isImplementation(Wsocket.prototype, this)) return new Wsocket(url, protocol)
  validate(isString, url)
  bindAll(this)
  this.url = url
  this.protocol = protocol
  this.que = TaskQueAsync()
  this.nativeWsocket = null
  this.sendBuffer = []
  this.reconnectTimer = null
  this.reconnectAttempts = 0
  this.maxReconnectInterval = 1000 * 60
  this.onopen = null
  this.onclose = null
  this.onerror = null
  this.onmessage = null
}

assign(Wsocket.prototype, {
  open () {
    wsocketEnque.call(this, wsocketOpen)
  },
  close () {
    wsocketEnque.call(this, wsocketClose)
  },
  send (msg) {
    wsocketEnque.call(this, wsocketSend, msg)
  },
  sendJSON (msg) {
    this.send(JSON.stringify(msg))
  },
  calcReconnectInterval () {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectInterval)
  },
})

// Wsocket private methods

function wsocketEnque (task) {
  return this.que.push(task.bind(this, ...slice(arguments, 1)))
}

function wsocketOpen () {
  if (!isNativeWsocketActive(this.nativeWsocket)) {
    if (this.nativeWsocket) wsocketClearNativeWs.call(this)
    this.nativeWsocket = assign(new WebSocket(this.url, this.protocol), {
      wsocket: this, onopen, onclose, onerror, onmessage
    })
  }
}

function wsocketClose () {
  wsocketClearNativeWs.call(this)
  wsocketClearReconnect.call(this)
}

function wsocketSend (msg) {
  this.sendBuffer.push(msg)
  if (isNativeWsocketOpen(this.nativeWsocket)) wsocketFlushSendBuffer.call(this)
}

function wsocketReconnect () {
  if (!this.reconnectTimer) {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, this.calcReconnectInterval())
    this.reconnectAttempts += 1
  }
}

function wsocketFlushSendBuffer () {
  while (this.nativeWsocket && this.sendBuffer.length) {
    this.nativeWsocket.send(this.sendBuffer.shift())
  }
}

function wsocketClearNativeWs () {
  if (this.nativeWsocket) {
    this.nativeWsocket.onclose = null
    this.nativeWsocket.close()
    this.nativeWsocket = null
  }
}

function wsocketClearReconnect () {
  clearTimeout(this.reconnectTimer)
  this.reconnectTimer = null
  this.reconnectAttempts = 0
}

// WebSocket listeners

function onopen (event) {
  validateSocketPair(this)
  wsocketClearReconnect.call(this.wsocket)
  try {
    if (isFunction(this.wsocket.onopen)) this.wsocket.onopen(event)
  } finally {
    wsocketFlushSendBuffer.call(this.wsocket)
  }
}

function onclose (event) {
  validateSocketPair(this)
  try {
    if (isFunction(this.wsocket.onclose)) this.wsocket.onclose(event)
  } finally {
    wsocketClearNativeWs.call(this.wsocket)
    wsocketEnque.call(this.wsocket, wsocketReconnect)
  }
}

// This fires:
// when native WS closes (nativeWsocket.readyState === nativeWsocket.CLOSED)
// when native WS starts reconnecting (nativeWsocket.readyState === nativeWsocket.CONNECTING)
function onerror (event) {
  validateSocketPair(this)
  if (isFunction(this.wsocket.onerror)) this.wsocket.onerror(event)
}

function onmessage (event) {
  validateSocketPair(this)
  if (isFunction(this.wsocket.onmessage)) this.wsocket.onmessage(event)
}

/**
 * QueAsync
 */

const IDLE     = 'IDLE'
const DAMMED   = 'DAMMED'
const FLUSHING = 'FLUSHING'

function QueAsync (deque) {
  if (!isImplementation(QueAsync.prototype, this)) return new QueAsync()
  validate(isFunction, deque)
  bindAll(this)
  this.deque = deque
  this.state = IDLE
  this.flushTimer = null
  this.pending = []
}

assign(QueAsync.prototype, {
  states: {
    IDLE,
    DAMMED,
    FLUSHING,
  },
  dam () {
    if (this.state === IDLE) this.state = DAMMED
  },
  push (value) {
    this.pending.push(value)
    if (this.state === IDLE) this.flush()
    return this.pull.bind(this, value)
  },
  pull (value) {
    return includes(this.pending, value) && (pull(this.pending, value), true)
  },
  flush () {
    if (this.state === FLUSHING) return
    this.state = FLUSHING
    this.flushTimer = setTimeout(this.flushNext)
  },
  isEmpty () {
    return !this.pending.length
  },
  flushNext () {
    this.flushTimer = null
    try {
      if (this.pending.length) this.deque(this.pending.shift())
    } finally {
      if (this.pending.length) this.flushTimer = setTimeout(this.flushNext)
      else this.state = IDLE
    }
  },
  clear () {
    clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.pending.splice(0)
    this.state = IDLE
  },
})

/**
 * TaskQueAsync
 */

function TaskQueAsync () {
  if (!isImplementation(TaskQueAsync.prototype, this)) return new TaskQueAsync()
  QueAsync.call(this, call)
}

assign(TaskQueAsync.prototype, QueAsync.prototype, {
  push (fun) {
    return QueAsync.prototype.push.call(this, fun.bind(this, ...slice(arguments, 1)))
  },
})

/**
 * Utils
 */

function isNativeWsocketOpen (nativeWsocket) {
  return nativeWsocket && nativeWsocket.readyState === nativeWsocket.OPEN
}

function isNativeWsocketActive (nativeWsocket) {
  return nativeWsocket && (
    isNativeWsocketOpen(nativeWsocket) || nativeWsocket.readyState === nativeWsocket.CONNECTING
  )
}

function validateSocketPair (nativeWsocket) {
  if (nativeWsocket.wsocket.nativeWsocket !== nativeWsocket) {
    throw Error('Unexpected unpairing of native and synthetic sockets')
  }
}
