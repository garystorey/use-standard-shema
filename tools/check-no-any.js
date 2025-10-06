const fs = require('fs')
const path = require('path')

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filepath = path.join(dir, file)
    const stat = fs.statSync(filepath)
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist') return
      walk(filepath, filelist)
    } else if (/\.tsx?$/.test(file)) {
      filelist.push(filepath)
    }
  })
  return filelist
}

const roots = ['src', 'tests']
let found = []
for (const root of roots) {
  if (!fs.existsSync(root)) continue
  const files = walk(root)
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8')
  // Detect actual TypeScript 'any' usage patterns: `: any`, `as any`, or generic `<any`
  const re = /(:\s*any\b)|(\bas\s+any\b)|(<any\b)/
  if (re.test(content)) found.push(f)
  }
}

if (found.length > 0) {
  console.error('\nFound `any` in the following files:')
  for (const f of found) console.error(' - ' + f)
  console.error('\nDEBUG: found array contents:', JSON.stringify(found, null, 2))
  process.exit(1)
}
console.log('No `any` usages found (in src/tests).')
process.exit(0)
