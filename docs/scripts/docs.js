const {webbs} = window

/**
 * Mock
 */

const ws = window.ws = new webbs.Webbs()

ws.onEachOpen = function onEachOpen(event) {
  console.info('socket connected:', event)
}

ws.onEachClose = function onEachClose(event) {
  console.warn('socket connection lost:', event)
}

ws.onEachError = function onEachError(event) {
  console.error(event)
}

ws.onEachMessage = function onEachMessage({data}) {
  console.info('socket message:', data)
}

ws.open('ws://localhost:7687')

/**
 * REPL
 */

bind(console, 'log')
bind(console, 'info')
bind(console, 'warn')
bind(console, 'info')

function bind(object, method) {
  if (!/bound/.test(object[method].name)) {
    object[method] = object[method].bind(object)
  }
}
