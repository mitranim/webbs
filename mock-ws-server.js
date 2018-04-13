'use strict'

const log = require('fancy-log')
const repl = require('repl')
const WS = require('ws')

const PORT = 7687

global.env = {
  broadcast(text) {
    log(`Broadcasting to ${server.clients.size} clients`)
    for (const socket of server.clients) socket.send(text)
  },
}

/**
 * Server
 */

const server = new WS.Server({
  port: PORT,
})

server.on('listening', err => {
  if (err) throw err
  log(`Server listening on port ${PORT}`)
})

server.on('connection', (ws, req) => {
  const {socket: {remoteAddress, remotePort}} = req
  const address = `${remoteAddress}:${remotePort}`
  log(`Incoming websocket connection from ${address}`)

  ws.on('message', msg => {
    log(`Received message: ${msg}`)
    global.env.broadcast(msg)
  })

  ws.on('close', (_reasonCode, _description) => {
    log(`Peer from ${address} disconnected.`)
  })
})

/**
 * REPL
 */

repl.start()
