import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))

export const backendDir = path.resolve(scriptsDir, '..')
export const tmpDir = path.join(backendDir, '.tmp')
export const contextFilePath = path.join(tmpDir, 'hold-lock-context.json')
export const logAPath = path.join(tmpDir, 'dual-instance-A.log')
export const logBPath = path.join(tmpDir, 'dual-instance-B.log')

export const ensureTmpDir = async () => {
  await fs.mkdir(tmpDir, { recursive: true })
}

export const writeContext = async (context) => {
  await ensureTmpDir()
  await fs.writeFile(contextFilePath, `${JSON.stringify(context, null, 2)}\n`, 'utf8')
}

export const readContext = async () => {
  const raw = await fs.readFile(contextFilePath, 'utf8')
  return JSON.parse(raw)
}
