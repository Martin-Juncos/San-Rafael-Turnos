import 'dotenv/config'
import { runHoldLockSetup } from './test_hold_lock_setup.mjs'
import { runDualInstanceWindow } from './test_hold_lock_run_dual.mjs'
import { verifyHoldLockSingleInstance } from './test_hold_lock_verify.mjs'
import { teardownHoldLockTestData } from './test_hold_lock_teardown.mjs'

const toBool = (value) => String(value || '').toLowerCase() === 'true'

const main = async () => {
  const startedAt = Date.now()
  let setupResult = null

  try {
    setupResult = await runHoldLockSetup()
    process.stdout.write(`SETUP_OK appointmentId=${setupResult.appointmentId}\n`)

    const dualResult = await runDualInstanceWindow()
    process.stdout.write(`DUAL_OK runWindowMs=${dualResult.runWindowMs}\n`)

    const verification = await verifyHoldLockSingleInstance({
      appointmentId: setupResult.appointmentId
    })

    if (!verification.pass) {
      process.stderr.write(`HOLD_LOCK_E2E=FAIL\n${JSON.stringify(verification, null, 2)}\n`)
      process.stderr.write(
        `Revisar logs: ${verification.evidence.logAPath} | ${verification.evidence.logBPath}\n`
      )
      process.exit(1)
    }

    process.stdout.write(`HOLD_LOCK_E2E=PASS\n${JSON.stringify(verification, null, 2)}\n`)

    const keepData = toBool(process.env.HOLD_LOCK_TEST_KEEP_DATA)
    if (!keepData) {
      const teardown = await teardownHoldLockTestData({
        appointmentId: setupResult.appointmentId
      })
      process.stdout.write(`TEARDOWN=${JSON.stringify(teardown)}\n`)
    }

    const elapsedMs = Date.now() - startedAt
    process.stdout.write(`TOTAL_MS=${elapsedMs}\n`)
    process.exit(0)
  } catch (error) {
    process.stderr.write(`HOLD_LOCK_E2E_FAIL=${error.message}\n`)

    const teardownOnFail = toBool(process.env.HOLD_LOCK_TEST_TEARDOWN_ON_FAIL)
    if (teardownOnFail && setupResult?.appointmentId) {
      try {
        const teardown = await teardownHoldLockTestData({
          appointmentId: setupResult.appointmentId
        })
        process.stderr.write(`TEARDOWN_ON_FAIL=${JSON.stringify(teardown)}\n`)
      } catch (teardownError) {
        process.stderr.write(`TEARDOWN_ON_FAIL_ERROR=${teardownError.message}\n`)
      }
    }

    process.exit(1)
  }
}

main()
