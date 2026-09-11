import fs from 'node:fs'
import ts from 'typescript'
const path = 'src/App.tsx'; let text = fs.readFileSync(path,'utf8')
const file = ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); const edits=[]
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'option' && node.openingElement.attributes.properties.length === 0) {
    const child = node.children[0]
    if (child && ts.isJsxExpression(child) && child.expression && ts.isCallExpression(child.expression) && ts.isStringLiteral(child.expression.arguments[0])) edits.push({pos:node.openingElement.end-1, value: ` value=${JSON.stringify(child.expression.arguments[0].text)}`})
  }
  ts.forEachChild(node,visit)
}
visit(file); for (const e of edits.sort((a,b)=>b.pos-a.pos)) text=text.slice(0,e.pos)+e.value+text.slice(e.pos)
fs.writeFileSync(path,text)
