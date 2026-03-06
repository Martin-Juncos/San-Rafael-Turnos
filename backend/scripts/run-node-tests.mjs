import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const cwd = process.cwd()
const mode = process.argv[2]
const extraArgs = process.argv.slice(3)

const isTestFile = (name) => name.endsWith('.test.js')

const listFiles = (dirPath, recursive = false) => {
  const entries = readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...listFiles(fullPath, true))
      }
      continue
    }

    if (entry.isFile() && isTestFile(entry.name)) {
      files.push(fullPath)
    }
  }

  return files.sort((left, right) => left.localeCompare(right))
}

let targetFiles = []

if (mode === 'unit') {
  targetFiles = listFiles(resolve(cwd, 'tests'), false)
} else if (mode === 'integration') {
  const integrationDir = resolve(cwd, 'tests', 'integration')
  if (statSync(integrationDir, { throwIfNoEntry: false })?.isDirectory()) {
    targetFiles = listFiles(integrationDir, true)
  }
} else {
  console.error(`Modo de test no soportado: ${mode || '(vacio)'}`)
  process.exit(1)
}

if (targetFiles.length === 0) {
  console.error(`No se encontraron archivos de test para el modo "${mode}".`)
  process.exit(1)
}

const result = spawnSync(
  process.execPath,
  ['--test', ...extraArgs, ...targetFiles],
  {
    stdio: 'inherit',
    cwd
  }
)

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
