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

window.Webbs = Webbs

const webbs = window.webbs = new Webbs('ws://localhost:7687')

webbs.onEachOpen = function onEachOpen (event) {
  console.info('socket connected:', event)
}

webbs.onEachClose = function onEachClose (event) {
  console.warn('socket connection lost:', event)
}

webbs.onEachError = function onEachError (event) {
  console.error(event)
}

webbs.onEachMessage = function onEachMessage ({data}) {
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
