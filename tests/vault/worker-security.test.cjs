const test = require('node:test')
const assert = require('node:assert/strict')
const { createVaultWorkerHarness } = require('./worker-harness.cjs')

test('vault worker setup/unlock/lock flow keeps the same DEK', async () => {
  const worker = createVaultWorkerHarness()

  try {
    const setup = await worker.request('setupMasterPassword', {
      masterPassword: 'CorrectHorseBatteryStaple!123'
    })

    assert.equal(setup.kdfType, 'argon2id')
    assert.ok(setup.dekWrappedByMaster)
    assert.ok(setup.dekWrappedByRecovery)
    assert.ok(setup.recoveryKey)

    const originalDek = await worker.request('exportDEK')
    assert.ok(originalDek.dekBase64)

    await worker.request('lock')
    await assert.rejects(worker.request('exportDEK'), /Vault is locked/)

    await assert.rejects(
      worker.request('unlockWithMasterPassword', {
        wrapped: setup.dekWrappedByMaster,
        masterPassword: 'wrong-password',
        salt: setup.salt,
        kdfType: setup.kdfType,
        kdfParams: setup.kdfParams
      }),
      /unable to authenticate data|Unsupported state|bad decrypt|Invalid/i
    )

    await worker.request('unlockWithMasterPassword', {
      wrapped: setup.dekWrappedByMaster,
      masterPassword: 'CorrectHorseBatteryStaple!123',
      salt: setup.salt,
      kdfType: setup.kdfType,
      kdfParams: setup.kdfParams
    })
    const masterDek = await worker.request('exportDEK')
    assert.equal(masterDek.dekBase64, originalDek.dekBase64)

    await worker.request('lock')
    await worker.request('unlockWithRecoveryKey', {
      wrapped: setup.dekWrappedByRecovery,
      recoveryKey: setup.recoveryKey,
      salt: setup.salt,
      kdfType: setup.kdfType,
      kdfParams: setup.kdfParams
    })
    const recoveryDek = await worker.request('exportDEK')
    assert.equal(recoveryDek.dekBase64, originalDek.dekBase64)
  } finally {
    await worker.shutdown()
  }
})

test('vault worker encrypt/decrypt roundtrip and setDEK restore', async () => {
  const worker = createVaultWorkerHarness()

  try {
    await worker.request('setupMasterPassword', {
      masterPassword: 'AnotherStrongPassword!456'
    })

    const encrypted = await worker.request('encryptItemPayload', {
      plaintext: JSON.stringify({ username: 'alice', password: 's3cr3t' })
    })
    assert.equal(encrypted.encVersion, 1)
    assert.ok(encrypted.encryptedPayload)
    assert.ok(encrypted.wrappedItemKey)

    const decrypted = await worker.request('decryptItemPayload', {
      encryptedPayload: encrypted.encryptedPayload,
      wrappedItemKey: encrypted.wrappedItemKey
    })
    assert.deepEqual(JSON.parse(decrypted.plaintext), {
      username: 'alice',
      password: 's3cr3t'
    })

    const reencrypted = await worker.request('reencryptItemPayload', {
      wrappedItemKey: encrypted.wrappedItemKey,
      plaintext: JSON.stringify({ username: 'alice', password: 'n3w-password' })
    })
    assert.ok(reencrypted.encryptedPayload)

    const reDecrypted = await worker.request('decryptItemPayload', {
      encryptedPayload: reencrypted.encryptedPayload,
      wrappedItemKey: encrypted.wrappedItemKey
    })
    assert.deepEqual(JSON.parse(reDecrypted.plaintext), {
      username: 'alice',
      password: 'n3w-password'
    })

    const exported = await worker.request('exportDEK')
    await worker.request('lock')
    await assert.rejects(
      worker.request('decryptItemPayload', {
        encryptedPayload: encrypted.encryptedPayload,
        wrappedItemKey: encrypted.wrappedItemKey
      }),
      /Vault is locked/
    )

    await worker.request('setDEK', { dekBase64: exported.dekBase64 })
    const restored = await worker.request('decryptItemPayload', {
      encryptedPayload: encrypted.encryptedPayload,
      wrappedItemKey: encrypted.wrappedItemKey
    })
    assert.deepEqual(JSON.parse(restored.plaintext), {
      username: 'alice',
      password: 's3cr3t'
    })
  } finally {
    await worker.shutdown()
  }
})
