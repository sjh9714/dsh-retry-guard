import { spawn } from 'node:child_process'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
// Always isolated: never reads or overwrites ~/.dsh or the caller's DSH_HOME.
const demoHome = resolve(root, '.work/demo-home')
const overlay = resolve(root, '.work/demo.patch.yml')
const fixture = resolve(root, 'examples/web-fixture.ts')
const cli = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
const env = { ...process.env, DSH_HOME: demoHome }
const run = (args) => new Promise((accept, reject) => {
  const child = spawn(process.execPath, [cli, ...args], { cwd: root, env, stdio: 'inherit' })
  child.once('error', reject)
  child.once('exit', code => code === 0 ? accept() : reject(new Error(`dsh exited with code ${code}`)))
})
await mkdir(demoHome, { recursive: true })
await writeFile(overlay, [
  '- insert:', '    - id: retry-guard-demo-fixture', `      name: ${JSON.stringify(fixture)}`,
  // Disable paid model routes and account activity in this disposable demo only.
  '- id: llm-deepseek', '  disabled: true', '- id: llm-deepseek-account', '  disabled: true',
  '- id: llm-pi-ai', '  disabled: true',
].join('\n') + '\n')
const archive = join(root, 'artifacts/dsh-retry-guard-0.1.0-alpha.1.tgz')
const digest = createHash('sha256').update(await readFile(archive)).digest('hex').slice(0, 16)
// pnpm may reuse the installed file dependency when an archive is overwritten
// at the same path/version. Give each local build a content-addressed path.
const installArchive = join(root, `.work/dsh-retry-guard-${digest}.tgz`)
await copyFile(archive, installArchive)
await run(['plugin', '--profile', 'web', 'add', installArchive])
console.log('Local scripted demo. Set Retry Guard → Configure → mode: pause, then start a new session.')
console.log('Send "run fixture". After it pauses, send "fixture repair" to verify resumption.')
await run(['web', '--patch', overlay, '--host', '127.0.0.1', '--port', process.env.RETRY_GUARD_DEMO_PORT ?? '3087', '--no-open'])
