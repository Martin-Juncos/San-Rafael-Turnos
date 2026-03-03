import 'dotenv/config'
import { createWriteStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { EXPIRED_HOLDS_ADVISORY_LOCK_KEY } from '../src/jobs/expiredHoldsJob.js'
import {
  backendDir,
  ensureTmpDir,
  logAPath,
  logBPath,
  readContext
} from './test_hold_lock_common.mjs'

const { Client } = pg

const waitForExit = async (child, timeoutMs) => {
  if (child.exitCode !== null) {
    return true
  }

  return new Promise((resolve) => {
    let resolved = false
    const onExit = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      resolve(true)
    }
    const timeout = setTimeout(() => {
      if (resolved) return
      resolved = true
      child.off('exit', onExit)
      resolve(false)
    }, timeoutMs)

    child.once('exit', onExit)
  })
}

const stopChild = async (child) => {
  if (child.exitCode !== null) {
    return
  }

  child.kill('SIGINT')
  if (await waitForExit(child, 4000)) {
    return
  }

  child.kill('SIGTERM')
  if (await waitForExit(child, 3000)) {
    return
  }

  child.kill('SIGKILL')
  await waitForExit(child, 2000)
}

const wireLogs = (child, stream, instanceName) => {
  child.stdout.on('data', (chunk) => {
    stream.write(`[${instanceName}] ${chunk.toString()}`)
  })

  child.stderr.on('data', (chunk) => {
    stream.write(`[${instanceName}] ${chunk.toString()}`)
  })
}

const assertProcessesAlive = (processes) => {
  const dead = processes.find((item) => item.child.exitCode !== null)
  if (dead) {
    throw new Error(`La instancia ${dead.name} finalizo temprano con exitCode=${dead.child.exitCode}`)
  }
}

export const runDualInstanceWindow = async () => {
  await ensureTmpDir()
  await readContext()
  await fs.writeFile(logAPath, '', 'utf8')
  await fs.writeFile(logBPath, '', 'utf8')

  const runWindowMs = Number.parseInt(process.env.HOLD_LOCK_TEST_RUN_MS || '90000', 10)
  const lockHoldMs = Number.parseInt(process.env.HOLD_LOCK_TEST_INITIAL_LOCK_MS || '8000', 10)

  const lockClient = new Client({
    connectionString: process.env.DATABASE_URL
  })

  let initialLockAcquired = false
  let lockReleased = false
  let childA
  let childB
  const logStreamA = createWriteStream(logAPath, { flags: 'a' })
  const logStreamB = createWriteStream(logBPath, { flags: 'a' })

  try {
    await lockClient.connect()
    const { rows: lockRows } = await lockClient.query(
      'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
      [EXPIRED_HOLDS_ADVISORY_LOCK_KEY]
    )

    initialLockAcquired = Boolean(lockRows[0]?.acquired)
    if (!initialLockAcquired) {
      throw new Error('No se pudo adquirir lock inicial para forzar contencion en la prueba dual')
    }

    const baseEnv = {
      ...process.env,
      APPOINTMENT_HOLD_MINUTES: '1',
      HOLD_EXPIRATION_JOB_INTERVAL_MINUTES: '1'
    }

    childA = spawn(process.execPath, ['src/server.js'], {
      cwd: backendDir,
      env: {
        ...baseEnv,
        PORT: '4001'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    childB = spawn(process.execPath, ['src/server.js'], {
      cwd: backendDir,
      env: {
        ...baseEnv,
        PORT: '4002'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    wireLogs(childA, logStreamA, 'A')
    wireLogs(childB, logStreamB, 'B')

    const processes = [
      { name: 'A', child: childA },
      { name: 'B', child: childB }
    ]

    await sleep(lockHoldMs)
    assertProcessesAlive(processes)

    const { rows: unlockRows } = await lockClient.query(
      'SELECT pg_advisory_unlock($1::bigint) AS released',
      [EXPIRED_HOLDS_ADVISORY_LOCK_KEY]
    )
    lockReleased = Boolean(unlockRows[0]?.released)
    if (!lockReleased) {
      throw new Error('No se pudo liberar lock inicial de contencion')
    }

    const remainingMs = Math.max(0, runWindowMs - lockHoldMs)
    const stepMs = 1000
    let elapsedMs = 0
    while (elapsedMs < remainingMs) {
      await sleep(stepMs)
      elapsedMs += stepMs
      assertProcessesAlive(processes)
    }

    return {
      runWindowMs,
      lockHoldMs,
      logs: {
        A: logAPath,
        B: logBPath
      }
    }
  } finally {
    if (childA) {
      await stopChild(childA)
    }
    if (childB) {
      await stopChild(childB)
    }

    if (initialLockAcquired && !lockReleased) {
      try {
        await lockClient.query(
          'SELECT pg_advisory_unlock($1::bigint)',
          [EXPIRED_HOLDS_ADVISORY_LOCK_KEY]
        )
      } catch {}
    }

    try {
      await lockClient.end()
    } catch {}

    logStreamA.end()
    logStreamB.end()
  }
}

const isDirectRun = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)

if (isDirectRun) {
  runDualInstanceWindow()
    .then((result) => {
      process.stdout.write(`HOLD_LOCK_TEST_DUAL_DONE=true\n`)
      process.stdout.write(`HOLD_LOCK_TEST_LOG_A=${result.logs.A}\n`)
      process.stdout.write(`HOLD_LOCK_TEST_LOG_B=${result.logs.B}\n`)
      process.exit(0)
    })
    .catch((error) => {
      process.stderr.write(`HOLD_LOCK_TEST_DUAL_FAIL=${error.message}\n`)
      process.exit(1)
    })
}
