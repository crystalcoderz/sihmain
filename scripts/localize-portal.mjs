import fs from 'node:fs'
import ts from 'typescript'
const path = 'src/App.tsx'
let source = fs.readFileSync(path, 'utf8')
const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const edits = []
function visit(node) {
  if (ts.isJsxText(node) && node.getText(file).trim()) edits.push({ start: node.pos, end: node.end, text: `{translate(${JSON.stringify(source.slice(node.pos, node.end))})}` })
  if (ts.isJsxAttribute(node) && ['title','subtitle','label','placeholder'].includes(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) edits.push({ start: node.initializer.getStart(file), end: node.initializer.end, text: `{translate(${JSON.stringify(node.initializer.text)})}` })
  ts.forEachChild(node, visit)
}
visit(file)
for (const edit of edits.sort((a,b) => b.start - a.start)) source = source.slice(0,edit.start) + edit.text + source.slice(edit.end)
source = "import { translate } from './portal-copy'\n" + source
// Preserve stable option values while translating labels.
source = source.replaceAll('<option>{translate("', '<option>{translate("')
source = source.replaceAll('<option key={item}>{item}</option>', '<option key={item} value={item}>{translate(item)}</option>')
source = source.replaceAll('<option>{translate("', '<option>{translate("')
fs.writeFileSync(path, source)
