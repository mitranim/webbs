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
  log('received HTTP request')
  // log(`Rejecting HTTP request for ${request.url}`)
  response.writeHead(404)
  response.end()
})

server.listen(port, () => {
  log(`Server listening on port ${port}`)
})

const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: true
})

wsServer.on('connect', socket => {
  log(`Accepted connection: ${socket.remoteAddress}`)

  global.env.sockets = append(global.env.sockets, socket)

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
