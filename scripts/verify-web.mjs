// Run after `pnpm demo:web`. This only uses the repository's isolated demo home.
import assert from 'node:assert/strict'
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises'
import { zstdDecompressSync } from 'node:zlib'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { resolve, sep } from 'node:path'

const root = new URL('../', import.meta.url)
process.chdir(fileURLToPath(root))
const demoHome = resolve(process.env.RETRY_GUARD_TEST_HOME ?? '.work/demo-home')
assert.ok(demoHome.startsWith(resolve('.work') + sep), 'Web verification may only use a disposable home under .work')
const log = await readFile('.work/demo-web.log', 'utf8')
const address = [...log.matchAll(/dsh web: (http:\/\/\S+)/g)].at(-1)?.[1]
assert.ok(address && new URL(address).hostname === '127.0.0.1', 'Start the isolated demo and redirect its output to .work/demo-web.log')
await mkdir('artifacts/verification', { recursive: true })

async function sessionFor(marker) {
  for await (const path of glob(`${demoHome}/sessions/**/session.v4.jsonl.zstd`)) {
    let input = await readFile(path), text = ''
    // DSH appends independent Zstandard frames. Node's synchronous decoder reads
    // one frame per call; advance by the actual consumed bytes, not the output.
    while (input.length) {
      const frame = zstdDecompressSync(input, { info: true })
      assert.ok(frame.engine.bytesWritten > 0)
      text += frame.buffer.toString()
      input = input.subarray(frame.engine.bytesWritten)
    }
    const events = text.trim().split('\n').map(line => JSON.parse(line))
    if (events.some(event => event.type === 'user/message' && event.data.source.kind === 'user' &&
      event.data.content.some(block => block.type === 'text' && block.text.includes(marker)))) return events
  }
  throw new Error('Expected demo session was not persisted')
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.setDefaultTimeout(15_000)

async function openSettings() {
  await page.getByRole('button', { name: 'Plugins', exact: true }).click()
  await page.getByRole('button', { name: 'View dsh-retry-guard', exact: true }).click()
  await page.getByRole('button', { name: 'Configure dsh-retry-guard', exact: true }).click()
}

async function settings(mode) {
  await openSettings()
  await page.getByRole('combobox', { name: /^Mode/ }).selectOption(mode)
  await page.getByRole('spinbutton', { name: /^Consecutive failure limit/ }).fill('3')
  await page.getByRole('textbox', { name: /^Excluded tools/ }).fill('')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await page.getByText('Settings saved. New calls use these settings.').waitFor()
}

async function start(marker) {
  await page.getByRole('button', { name: 'New session', exact: true }).last().click()
  const composer = page.getByRole('textbox', { name: 'Describe what you want to build, / commands, @ files or sessions' })
  await composer.waitFor()
  await page.getByRole('button', { name: /^Select model/ }).click()
  await page.getByRole('menuitem', { name: /^Model / }).click()
  await page.getByRole('menuitemradio', { name: 'Local fixture · no API key', exact: true }).click()
  await composer.fill(marker)
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
}

try {
  await page.goto(address)
  await Promise.race([
    page.getByRole('button', { name: 'Continue', exact: true }).waitFor(),
    page.getByRole('button', { name: 'Plugins', exact: true }).waitFor(),
  ])
  if (await page.getByRole('button', { name: 'Continue', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await settings('observe')
  // Invalid limits must not change the persisted profile.
  const patchPath = `${demoHome}/profiles/web/cordis.patch.yml`
  const before = await readFile(patchPath, 'utf8')
  const limit = page.getByRole('spinbutton', { name: /^Consecutive failure limit/ })
  await limit.fill('1')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  assert.equal(await limit.evaluate(input => input.checkValidity()), false)
  assert.equal(await readFile(patchPath, 'utf8'), before)
  await page.getByRole('button', { name: 'Reload saved settings', exact: true }).click()
  assert.equal(await limit.inputValue(), '3')

  const marker = `run fixture · scripted model, no API key · ${Date.now()}`
  await start(`${marker} observe`)
  await page.getByText('Scripted fixture finished after six attempts.', { exact: true }).waitFor()
  await page.getByRole('region', { name: 'Retry Guard report' }).waitFor()
  let events = await sessionFor(`${marker} observe`)
  assert.equal(events.filter(e => e.type === 'tool/result').length, 6)
  assert.equal(events.filter(e => e.type === 'step/start').length, 7)
  assert.ok(events.some(e => e.type === 'user/message' && e.data.source.report?.action === 'observed'))
  await page.screenshot({ path: 'artifacts/verification/observed.png' })

  await settings('pause')
  await page.screenshot({ path: 'artifacts/verification/settings.png' })
  await page.reload()
  await openSettings()
  await page.getByRole('combobox', { name: /^Mode/ }).waitFor()
  assert.equal(await page.getByRole('combobox', { name: /^Mode/ }).inputValue(), 'pause')
  await start(`${marker} pause`)
  await page.getByText('Retry Guard paused: retry_guard_probe failed 3 times', { exact: true }).waitFor()
  const paused = await sessionFor(`${marker} pause`)
  assert.equal(paused.filter(e => e.type === 'tool/result').length, 3)
  assert.equal(paused.filter(e => e.type === 'step/start').length, 3)
  assert.ok(paused.some(e => e.type === 'turn/end' && e.data.reason.kind === 'blocked'))
  const report = paused.find(e => e.type === 'user/message' && e.data.source.kind === 'dsh-retry-guard').data.source.report
  assert.equal(report.failureCount, 3)
  assert.equal(report.resultRefs.length, 2)
  await page.screenshot({ path: 'artifacts/verification/paused.png' })

  await page.getByRole('textbox', { name: 'Message or run a task, / commands, @ files or sessions' }).fill('fixture repair')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.getByText('Fixture recovered. The repaired tool succeeded.', { exact: true }).waitFor()
  events = await sessionFor(`${marker} pause`)
  assert.deepEqual(events.slice(0, paused.length), paused, 'Original persisted events must be preserved')
  const results = events.filter(e => e.type === 'tool/result')
  assert.equal(results.length, 4)
  assert.equal(results.at(-1).data.message.isError, false)
  assert.equal(events.filter(e => e.type === 'user/message' && e.data.source.kind === 'user').length, 2)
  await page.screenshot({ path: 'artifacts/verification/resumed.png' })
  await context.storageState({ path: '.work/browser-state.json' })
  await writeFile('.work/demo-session-url.txt', page.url())
  assert.deepEqual(errors, [])
  const summary = {
    checkedAt: new Date().toISOString(), dshVersion: '0.2.0-rc.2', nodeVersion: process.version,
    browser: await browser.version(), model: 'Local scripted fixture; no provider API calls',
    observe: { toolCalls: 6, modelSteps: 7 }, pause: { toolCalls: 3, modelSteps: 3 },
    resumed: { totalToolCalls: 4, repairedCalls: 1, originalEventsPreserved: true },
    settingsPersistedAfterReload: true, invalidLimitRejected: true, browserErrors: errors,
  }
  await writeFile('artifacts/verification/web-results.json', JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  await page.screenshot({ path: 'artifacts/verification/web-failure.png' }).catch(() => {})
  console.error((await page.locator('body').innerText()).slice(-5000))
  throw error
} finally {
  await browser.close()
}
