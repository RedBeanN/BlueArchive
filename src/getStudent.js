const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')
const langs = ['cn', 'jp', 'en', 'tw', 'kr', 'th', 'vi']

/** @typedef { import('../types/student').Student } Student */

/** @type { Map<string,Student[]> } */
const studentMap = new Map()

const customStudents = require('./customStudents')

let _initted = false
const initStudentMap = () => {
  if (_initted) return
  for (const l of langs) {
    const p = resolve(__dirname, `../assets/data/${l}/students.json`)
    if (existsSync(p)) {
      studentMap.set(l, JSON.parse(readFileSync(p, 'utf-8')))
    }
  }
  _initted = true
}

/**
 * @function
 * @param { number } id
 * @param { 'cn'|'jp'|'en'|'tw'|'kr'|'th'|'vi' } lang
 * @returns { Student }
 */
const getStudentById = (id = 0, lang = 'cn') => {
  initStudentMap()
  return studentMap.get(lang)?.find(i => i.Id === id)
}

/**
 * @function searchByName
 * @param { string } name
 * @param { Student[]} [specs]
 */
const searchByName = (name = '', specs = []) => {
  const found = []
  const lc = name.toLowerCase()
  const searching = []
  if (specs.length) {
    searching.push(specs)
    // console.log('Add', specs)
  }
  const customs = customStudents.get()
  if (customs.length) {
    searching.push(customs)
  }
  for (const l of langs) {
    const students = studentMap.get(l)
    if (students) searching.push(students)
  }
  for (const students of searching) {
    for (const s of students) {
      if ([s?.Name, s?.PathName, s?.DevName].some(n => n && n.toLowerCase() === name)) {
        // console.log('Exact map', name)
        return [s]
      }
      if ([
        s?.Name, s?.PathName, s?.DevName,
        s?.FamilyName, s?.PersonalName,
        s?.CharacterVoice,
      ].some(n => n && n.toLowerCase().includes(lc))) {
        found.push(s)
      }
    }
  }
  return found
}
const getStudentsByName = (name = '', specs = []) => {
  initStudentMap()
  const found = searchByName(name, specs)
  /** @type { Student[] } */
  const cns = []
  found.forEach(f => {
    if (cns.find(c => (c.Id === f.Id) || c.Name === f.Name)) return
    cns.push(getStudentById(f.Id) || f)
  })
  return cns.filter(i => i)
}

module.exports = { getStudentsByName, getStudentById }
