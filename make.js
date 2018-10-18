const fs = require('fs')
const languages = {
  CN: '汉语',
  EN: '英语',
  JP: '日语',
  FR: '法语',
  GE: '德语'
}
const csvParse = require("csv-parse/lib/sync")

function loadCsv(string) {
  const lines = csvParse(string)
  const idrow = lines[0]
  const namerow = lines[1]
  const datarows = lines.slice(3)
  for (let i = 0; i < idrow.length; i++) {
    namerow[i] = camelCase(namerow[i] || idrow[i])
  }
  const results = []
  for (let i = 0; i < datarows.length; i++) {
    const row = datarows[i];
    if (!row) {
      continue
    }
    const result = {}
    let cols = row
    for (let i = 0; i < namerow.length; i++) {
      if (namerow[i] === '#') {
        result[namerow[i]] = cols[i]
      }
      else {
        result[namerow[i]] = convert(cols[i])
      }
    }
    results.push(result)
  }
  return results
}

function convert(data) {
  if (data === 'True') {
    return true
  }
  if (data === 'False') {
    return false
  }
  try {
    return JSON.parse(data)
  } catch (e) {
    return data
  }
}

function camelCase(pascalCase) {
  return pascalCase[0].toLowerCase() + pascalCase.slice(1)
}

function loadFile(filename) {
  const buf = fs.readFileSync(filename)
  return loadCsv(buf.toString())
}

const data = {}
const keySet = new Set()
for (const k in languages) {
  const fn = `Completion-${k}.csv`
  const list = loadFile(fn)
  const r = {}
  for (const l of list) {
    r[l['#']] = l
    keySet.add(l['#'])
  }
  data[k] = r
}

const texts = []
for (const k of keySet.keys()) {
  const text = {}
  for (const lang in languages) {
    const t = data[lang][`${k}`] && data[lang][`${k}`]['2']
    const category = t && data[lang][`${k}`]['1']
    text[lang] = t || '{{Color|#cccccc|暂无}}'
    if (category) {
      console.log(category, text)
      text.isCategory = true
    }
  }
  texts.push(text)
}

fs.writeFileSync('autotranslate.json', texts.map(JSON.stringify).join('\r\n'))

const rows = []
for (const text of texts) {
  if (text.isCategory) {
    const name = (text['CN'] || text['EN']).replace(/[【】]/g, '')
    const isFirst = rows.length === 0
    if (!isFirst) {
      rows[rows.length - 1] = '|}'
    }
    rows.push('')
    rows.push(`== ${name} ==`)
    rows.push('')
    rows.push('{| class="wikitable"')
    rows.push('|-')
    for (const lang in languages) {
      rows.push(`! ${languages[lang]}`)
    }
    rows.push('|-')
  }
  for (const lang in languages) {
    rows.push(`| ${text[lang]}`)
  }
  rows.push('|-')
}
rows[rows.length - 2] = '|}'
rows[rows.length - 1] = ''
rows.unshift('本页是 [[定型文翻译系统]] 的定型文列表。')

fs.writeFileSync('autotranslate.wiki', rows.join('\r\n'))