'use strict'

const {slice, reduce} = Array.prototype
const {isFrozen} = Object

/**
 * Webbs
 */

export class Webbs {
  constructor (url, protocol) {
    validate(isString, url)

    if (this.constructor === Webbs) bindAll(this)

    this.url = url

    // WebSocket(url, undefined)  ->  ok
    // WebSocket(url, null)       ->  connection error
    this.protocol = protocol

    this.que = new TaskQueAsync()
    this.nativeWS = null
    this.sendBuffer = []
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectInterval = 1000 * 60
    this.onopen = null
    this.onclose = null
    this.onerror = null
    this.onmessage = null
  }

  open () {
    webbsEnque.call(this, webbsOpen)
  }

  close () {
    webbsEnque.call(this, webbsClose)
  }

  send (msg) {
    webbsEnque.call(this, webbsSend, msg)
  }

  sendJSON (msg) {
    this.send(JSON.stringify(msg))
  }

  calcReconnectInterval () {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectInterval)
  }

  deconstructor () {
    if (this.nativeWS) wsDeconstruct.call(this.nativeWS)
    this.que.clear()
    this.constructor(this.url, this.protocol)
    this.url = null
    this.protocol = undefined
  }
}

exports.Webbs = Webbs

// Webbs privates

function webbsEnque (task) {
  validate(isFunction, task)
  return this.que.push(task.bind(this, ...slice.call(arguments, 1)))
}

function webbsOpen () {
  if (!isNativeWSActive(this.nativeWS)) {
    if (this.nativeWS) webbsClearNativeWs.call(this)
    this.nativeWS = assign(new WebSocket(this.url, this.protocol), {
      webbs: this,
      onopen: wsOnOpen,
      onclose: wsOnClose,
      onerror: wsOnError,
      onmessage: wsOnMessage,
    })
  }
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
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, this.calcReconnectInterval())
    this.reconnectAttempts += 1
  }
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
    if (isFunction(this.webbs.onopen)) this.webbs.onopen(event)
  } finally {
    webbsFlushSendBuffer.call(this.webbs)
  }
}

function wsOnClose (event) {
  validateSocketPair(this)
  try {
    if (isFunction(this.webbs.onclose)) this.webbs.onclose(event)
  } finally {
    webbsClearNativeWs.call(this.webbs)
    webbsEnque.call(this.webbs, webbsReconnect)
  }
}

// This fires:
// when native WS closes (nativeWS.readyState === nativeWS.CLOSED)
// when native WS starts reconnecting (nativeWS.readyState === nativeWS.CONNECTING)
function wsOnError (event) {
  validateSocketPair(this)
  if (isFunction(this.webbs.onerror)) this.webbs.onerror(event)
}

function wsOnMessage (event) {
  validateSocketPair(this)
  if (isFunction(this.webbs.onmessage)) this.webbs.onmessage(event)
}

function wsDeconstruct () {
  this.webbs = this.onopen = this.onclose = this.onerror = this.onmessage = null
  const {readyState, CLOSED, CLOSING} = this
  if (readyState !== CLOSED && readyState !== CLOSING) this.close()
}

/**
 * QueAsync
 */

class QueAsync {
  constructor (deque) {
    validate(isFunction, deque)
    if (this.constructor === QueAsync) bindAll(this)
    this.deque = deque
    this.state = this.states.IDLE
    this.flushTimer = null
    this.pending = []
  }

  dam () {
    if (this.state === this.states.IDLE) this.state = this.states.DAMMED
  }

  push (value) {
    this.pending.push(value)
    if (this.state === this.states.IDLE) this.flush()
    // return this.pull.bind(this, value)
  }

  // pull (value) {
  //   return includes(this.pending, value) && (pull(this.pending, value), true)
  // }

  flush () {
    if (this.state === this.states.FLUSHING) return
    this.state = this.states.FLUSHING
    this.flushTimer = setTimeout(this._flushNext)
  }

  isEmpty () {
    return !this.pending.length
  }

  clear () {
    clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.pending.splice(0)
    this.state = this.states.IDLE
  }

  _flushNext () {
    this.flushTimer = null
    try {
      if (this.pending.length) this.deque(this.pending.shift())
    } finally {
      if (this.pending.length) this.flushTimer = setTimeout(this._flushNext)
      else this.state = this.states.IDLE
    }
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
    if (this.constructor === TaskQueAsync) bindAll(this)
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

function bindAll (object) {
  for (const key in object) {
    const value = object[key]
    if (isFunction(value)) object[key] = value.bind(object)
  }
  return object
}

function assign () {
  return reduce.call(arguments, assignOne)
}

function isMutable (value) {
  return typeof value === 'object' && value != null && !isFrozen(value)
}

function assignOne (object, src) {
  validate(isMutable, object)
  if (src) for (const key in src) object[key] = src[key]
  return object
}

// function pull (list, value) {
//   const index = list.indexOf(value)
//   if (~index) list.splice(index, 1)
//   return list
// }

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
