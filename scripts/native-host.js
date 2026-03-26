#!/Users/ryanbzhou/.local/share/fnm/node-versions/v22.21.1/installation/bin/node
'use strict'

const net = require('net')
const path = require('path')
const os = require('os')

const SOCKET_PATH = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'stash',
  'zpaste-ext.sock'
)

// Chrome Native Messaging: read 4-byte LE length + JSON from stdin
function readNativeMessage(callback) {
  let buffer = Buffer.alloc(0)

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])

    while (buffer.length >= 4) {
      const msgLen = buffer.readUInt32LE(0)
      if (buffer.length < 4 + msgLen) break

      const msgBuf = buffer.subarray(4, 4 + msgLen)
      buffer = buffer.subarray(4 + msgLen)

      try {
        const msg = JSON.parse(msgBuf.toString('utf8'))
        callback(msg)
      } catch (e) {
        sendNativeMessage({ id: 0, error: 'Invalid JSON from extension' })
      }
    }
  })
}

// Chrome Native Messaging: write 4-byte LE length + JSON to stdout
function sendNativeMessage(msg) {
  const json = JSON.stringify(msg)
  const buf = Buffer.from(json, 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(buf.length, 0)
  process.stdout.write(header)
  process.stdout.write(buf)
}

// Socket communication with Electron app
let socketConnection = null
let socketPending = new Map()

function connectToSocket() {
  return new Promise((resolve, reject) => {
    const conn = net.createConnection(SOCKET_PATH, () => {
      resolve(conn)
    })
    conn.on('error', reject)

    // Read length-prefixed responses from socket
    let buf = Buffer.alloc(0)
    conn.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      while (buf.length >= 4) {
        const len = buf.readUInt32LE(0)
        if (buf.length < 4 + len) break
        const msgBuf = buf.subarray(4, 4 + len)
        buf = buf.subarray(4 + len)
        try {
          const response = JSON.parse(msgBuf.toString('utf8'))
          // Forward response back to Chrome
          sendNativeMessage(response)
        } catch (e) {
          // ignore parse errors
        }
      }
    })
    conn.on('close', () => {
      socketConnection = null
    })
  })
}

function sendToSocket(msg) {
  const json = JSON.stringify(msg)
  const buf = Buffer.from(json, 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(buf.length, 0)
  socketConnection.write(header)
  socketConnection.write(buf)
}

async function ensureConnection() {
  if (socketConnection && !socketConnection.destroyed) return
  try {
    socketConnection = await connectToSocket()
  } catch (e) {
    socketConnection = null
    throw new Error('Cannot connect to Stash desktop app. Is it running?')
  }
}

// Main loop
readNativeMessage(async (msg) => {
  try {
    await ensureConnection()
    sendToSocket(msg)
  } catch (e) {
    sendNativeMessage({
      id: msg.id || 0,
      error: e.message || 'Connection failed'
    })
  }
})

process.stdin.on('end', () => {
  if (socketConnection) socketConnection.destroy()
  process.exit(0)
})

process.stdin.resume()
