import { mkdir, writeFile } from 'node:fs/promises'
import { reportedCase, scenarioNames } from './reported-cases.ts'

console.log('DSH 0.2.0-rc.2; scripted model, stub shell, local MCP protocol server; no API keys.')
console.log('Minimal report-inspired cases, not replays of original user sessions.')
const rows = []
for (const scenario of scenarioNames) {
  for (const mode of ['disabled', 'observe', 'pause'] as const) {
    const fixture = await reportedCase(scenario, mode)
    try { rows.push(fixture.summary) } finally { await fixture.close() }
  }
}
console.table(rows)
await mkdir('artifacts', { recursive: true })
await writeFile('artifacts/reported-cases.json', JSON.stringify({
  checkedAt: new Date().toISOString(), dshVersion: '0.2.0-rc.2',
  model: 'scripted', shell: 'stub', mcp: 'local JSON-RPC fixture', rows,
}, null, 2) + '\n')
console.log('Aggregate counts only: artifacts/reported-cases.json')
