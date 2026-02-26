const { fork } = require('node:child_process')
const path = require('node:path')

function createVaultWorkerHarness() {
  const workerPath = path.resolve(__dirname, '../../out/main/vault-worker.js')
  const child = fork(workerPath, [], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  })

  let nextId = 0
  const pending = new Map()

  child.on('message', message => {
    if (!message || typeof message !== 'object') {
      return
    }
    const { id, ok, result, error } = message
    if (typeof id !== 'number' || typeof ok !== 'boolean') {
      return
    }

    const request = pending.get(id)
    if (!request) {
      return
    }
    pending.delete(id)

    if (ok) {
      request.resolve(result)
      return
    }

    request.reject(new Error(error || 'Vault worker request failed'))
  })

  child.on('exit', () => {
    const requests = [...pending.values()]
    pending.clear()
    for (const request of requests) {
      request.reject(new Error('Vault worker exited'))
    }
  })

  function request(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      child.send({ id, action, payload }, err => {
        if (!err) {
          return
        }
        pending.delete(id)
        reject(err)
      })
    })
  }

  async function shutdown() {
    try {
      await request('shutdown')
    } catch {
      // ignore shutdown races
    }
    if (!child.killed) {
      child.kill()
    }
  }

  return {
    request,
    shutdown
  }
}

module.exports = {
  createVaultWorkerHarness
}
