'use strict'

const {createServer} = require('http')
const WebSocketServer = require('websocket').server
const {log} = require('gulp-util')
const repl = require('repl')
const {append, remove} = require('fpx')

/**
 * Interaction
 */

// For REPL convenience
global.env = {
  sockets: [],
  broadcast (text) {
    log(`Broadcasting to ${global.env.sockets.length} clients.`)
    for (const socket of global.env.sockets) {
      socket.sendUTF(text)
    }
  },
  server: null,
}

repl.start()

/**
 * Server
 */

const port = 7687

const server = global.env.server = createServer((request, response) => {
  log(`Rejecting HTTP request for ${request.url}`)
  response.writeHead(404)
  response.end()
})

server.listen(port, () => {
  log(`Server listening on port ${port}`)
})

const wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
})

function originIsAllowed(_origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true
}

wsServer.on('request', request => {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject()
    log(`Connection from origin ${request.origin} rejected.`)
    return
  }

  const socket = request.accept('', request.origin)

  global.env.sockets = append(global.env.sockets, socket)

  log(`Accepted connection from origin: ${request.origin}.`)

  // msg = {type: 'utf8' | 'binary', utf8Data, binaryData}
  socket.on('message', msg => {
    if (msg.type === 'utf8') {
      log(`Received message: ${msg.utf8Data}`)
      global.env.broadcast(msg.utf8Data)
    }
    else if (msg.type === 'binary') {
      log(`Received binary message of ${msg.binaryData.length} bytes.`)
    }
  })

  socket.on('close', (_reasonCode, _description) => {
    global.env.sockets = remove(global.env.sockets, socket)
    log(`Peer ${socket.remoteAddress} disconnected.`)
  })
})
