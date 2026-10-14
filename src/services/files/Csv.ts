// Keep spreadsheet programs from interpreting user text as formulas.
export function csvCell(value:unknown){
 const text=value===undefined||value===null?'':typeof value==='object'?JSON.stringify(value):String(value)
 const safe=typeof value==='string'&&/^[\s]*[=+\-@]/.test(text)?"'"+text:text
 return '"'+safe.replace(/"/g,'""')+'"'
}
export function csvDocument(rows:unknown[][]){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
