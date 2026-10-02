import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'

// DSH's documented lazy CommonJS factory format. React stays in the host's
// module table; bundling a second copy would break hooks and inflate the plugin.
const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.React, esModuleInterop: true,
} })
await writeFile(new URL('../lib/client.js', import.meta.url),
  'window.__ModuleLoader__.load({id:"dsh-retry-guard",factory:(require)=>{\nvar module={exports:{}};var exports=module.exports;\n'
  + outputText + '\nreturn module.exports;}});\n')
