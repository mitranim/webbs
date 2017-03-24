module.hot.accept(err => {
  console.warn('Exception during HMR update.', err)
})

module.hot.dispose(() => {
  console.clear()
  if (webbs) webbs.close()
})

/**
 * Mock
 */

const {Webbs} = require('webbs')

const webbs = window.webbs = new Webbs('ws://localhost:7687')

webbs.onopen = function onopen (event) {
  console.info('socket connected:', event)
}

webbs.onclose = function onclose (event) {
  console.warn('socket connection lost:', event)
}

webbs.onerror = function onerror (event) {
  console.error(event)
}

webbs.onmessage = function onmessage ({data}) {
  console.info('socket message:', data)
}

webbs.open()

/**
 * Debug
 */

;['log', 'info', 'warn', 'error', 'clear'].forEach(key => {
  if (!/bound/.test(console[key].name)) {
    window[key] = console[key] = console[key].bind(console)
  }
})
