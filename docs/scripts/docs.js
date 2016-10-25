module.hot.accept(err => {
  console.warn('Exception during HMR update.', err)
})

module.hot.dispose(() => {
  console.clear()
  if (ws) ws.close()
})

/**
 * Mock
 */

const {Ws} = require('webbs')

const ws = window.ws = Ws('ws://localhost:7687')

ws.onopen = function onopen (event) {
  console.info('-- socket connected:', event)
}

ws.onclose = function onclose (event) {
  console.warn('-- socket connection lost:', event)
}

ws.onerror = function onerror (event) {
  console.error(event)
}

ws.onmessage = function onmessage ({data}) {
  console.info('-- socket message:', data)
}

ws.open()

/**
 * Debug
 */

;['log', 'info', 'warn', 'error', 'clear'].forEach(key => {
  if (!/bound/.test(console[key].name)) {
    window[key] = console[key] = console[key].bind(console)
  }
})
