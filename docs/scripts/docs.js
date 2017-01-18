module.hot.accept(err => {
  console.warn('Exception during HMR update.', err)
})

module.hot.dispose(() => {
  console.clear()
  if (wsocket) wsocket.close()
})

/**
 * Mock
 */

const {Wsocket} = require('webbs')

const wsocket = window.wsocket = Wsocket('ws://localhost:7687')

wsocket.onopen = function onopen (event) {
  console.info('-- socket connected:', event)
}

wsocket.onclose = function onclose (event) {
  console.warn('-- socket connection lost:', event)
}

wsocket.onerror = function onerror (event) {
  console.error(event)
}

wsocket.onmessage = function onmessage ({data}) {
  console.info('-- socket message:', data)
}

wsocket.open()

/**
 * Debug
 */

;['log', 'info', 'warn', 'error', 'clear'].forEach(key => {
  if (!/bound/.test(console[key].name)) {
    window[key] = console[key] = console[key].bind(console)
  }
})
