// Optional maintainer tool: requires the isolated demo, Chromium and ffmpeg.
import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('../', import.meta.url)))
const log = await readFile('.work/demo-web.log', 'utf8')
const address = [...log.matchAll(/dsh web: (http:\/\/\S+)/g)].at(-1)?.[1]
assert.ok(address && new URL(address).hostname === '127.0.0.1')
assert.match(await readFile('.work/demo-home/profiles/web/cordis.patch.yml', 'utf8'), /mode: pause/)
await mkdir('docs/assets', { recursive: true })
await mkdir('.work/video', { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  storageState: '.work/browser-state.json', viewport: { width: 1280, height: 900 },
  recordVideo: { dir: '.work/video', size: { width: 1280, height: 900 } },
})
let video
try {
  const page = await context.newPage()
  video = page.video()
  await page.goto(address)
  await page.getByRole('button', { name: 'New session', exact: true }).last().click()
  const initial = page.getByRole('textbox', { name: 'Describe what you want to build, / commands, @ files or sessions' })
  await initial.waitFor()
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  await page.getByRole('button', { name: /^Select model/ }).click()
  await page.getByRole('menuitem', { name: /^Model / }).click()
  await page.getByRole('menuitemradio', { name: 'Local fixture · no API key', exact: true }).click()
  await initial.fill('Run fixture · scripted model · no API key')
  await delay(1200)
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.getByText('Retry Guard paused: retry_guard_probe failed 3 times', { exact: true }).waitFor()
  await page.screenshot({ path: 'docs/assets/paused.png' })
  await delay(5500)
  await page.getByRole('textbox', { name: 'Message or run a task, / commands, @ files or sessions' }).fill('fixture repair')
  await delay(1000)
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.getByText('Fixture recovered. The repaired tool succeeded.', { exact: true }).waitFor()
  await delay(6000)
} finally {
  await context.close()
  await browser.close()
}
const raw = await video.path()
// A 20-second capture of actual UI actions, padded only at the end if necessary.
const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
  '-vf', 'tpad=stop_mode=clone:stop_duration=3', '-t', '20', '-an', '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'docs/assets/demo.mp4'], { encoding: 'utf8' })
assert.equal(result.status, 0, result.stderr)
const gif = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'docs/assets/demo.mp4',
  '-filter_complex', '[0:v]fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
  'docs/assets/demo.gif'], { encoding: 'utf8' })
assert.equal(gif.status, 0, gif.stderr)
console.log('Saved docs/assets/demo.mp4 (20 seconds), demo.gif and paused.png. Real DSH UI; scripted model.')
