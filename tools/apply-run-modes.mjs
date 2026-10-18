// SPDX-License-Identifier: GPL-2.0-or-later
// Insert or refresh the run-modes block in workflow scripts.
// Usage: node tools/apply-run-modes.mjs path/to/workflows/*.js
// Spec: docs/reference/workflow-run-modes.md
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BEGIN = '// --- run-modes v'
const END = '// --- run-modes v1 end'
const here = dirname(fileURLToPath(import.meta.url))
const shim = readFileSync(join(here, 'run-modes.js'), 'utf8').split('\n')
const b = shim.findIndex((l) => l.startsWith(BEGIN))
const e = shim.findIndex((l) => l.startsWith(END))
const block = shim.slice(b, e + 1)
const tail = shim.find((l) => l.startsWith('// })(RUN.agent')).slice(3)

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node tools/apply-run-modes.mjs <workflow.js>...'); process.exit(2) }
let failed = 0
for (const f of files) {
  let lines = readFileSync(f, 'utf8').replace(/\n$/, '').split('\n')
  const ob = lines.findIndex((l) => l.startsWith(BEGIN))
  if (ob >= 0) {
    const oe = lines.findIndex((l, i) => i > ob && l.startsWith('// --- run-modes v') && l.includes(' end'))
    lines.splice(ob, oe - ob + 1, ...block)
    lines = lines.filter((l) => !l.startsWith('})(RUN.agent'))
  } else {
    const m = lines.findIndex((l) => l.startsWith('export const meta'))
    const close = lines.findIndex((l, i) => i > m && l === '}')
    if (m < 0 || close < 0) { console.error(`${f}: no top-level "export const meta = {...}" closed by "}" at column 0`); failed++; continue }
    lines.splice(close + 1, 0, '', ...block)
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  lines.push(tail)
  writeFileSync(f, lines.join('\n') + '\n')
  console.log(`${f}: run-modes v1 applied`)
}
process.exit(failed ? 1 : 0)
