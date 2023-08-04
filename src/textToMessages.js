/**
 * @typedef Message
 * @prop { 'student'|'teacher'|'option'|'kizuna' } type
 * @prop { import('./getStudent').Student } [student]
 * @prop { string|string[] } content
 */

const { getStudentsByName } = require('./getStudent')

const customStudents = require('./customStudents')

const commands = [
  'S', 's', // [S]tudent
  'T', 't', // [T]eacher
  'O', 'o', // [O]ptions
  'K', 'k', // [K]izuna
]

const getTypeByKey = key => {
  switch (key) {
    case 's':
    case 'S':
      return 'student'
    case 't':
    case 'T':
      return 'teacher'
    case 'o':
    case 'O':
      return 'option'
    case 'k':
    case 'K':
      return 'kizuna'
  }
  return ''
}
/**
 * @function textToMessages
 * @param { string } talks
 * @param { import('../types/student').Student[] } specs
 */
const textToMessages = (talks = '', specs = []) => {
  const messages = []
  let error = false
  const errors = []
  /** @type { Message } */
  let last = null
  let num = 0
  for (const line of talks.trim().split('\n').map(i => i.trim())) {
    num += 1
    const first = line[0]
    const sec = line[1]
    if (first !== '/' || !commands.includes(sec)) {
      if (!last) {
        error = true
        // console.log('not commnad', first, sec)
        errors.push(`第 ${num} 行 无法将 ${first}${sec} 解析为控制语句`)
        continue
      }
      if (last.type === 'option') {
        last.content.push(line)
      } else {
        last.content += '\n' + line
      }
    } else {
      const type = getTypeByKey(sec)
      if (!type) {
        error = true
        errors.push(`第 ${num} 行 无法将 ${sec} 解析为指令`)
        continue
      }
      if (last) messages.push(last)
      if (type === 'option') {
        last = { type: 'option', content: [line.substring(2).trim()] }
      } else if (type === 'student' || type === 'kizuna') {
        let [name, ...values] = line.substring(2).trim().split(' ')
        if (!name.length) {
          error = true
          errors.push(`第 ${num} 行 无法解析学生名`)
          continue
        }
        let cns = getStudentsByName(name, specs)
        let index = ''
        // console.log(name, cns.map(i => i.Name).join(' '))
        if (cns.length === 0 && name.match(/\d$/)) {
          index = name.match(/(\d+)$/)?.[1]
          name = name.replace(index, '')
          cns = getStudentsByName(name, specs)
          if (cns[index - 1]) cns = [cns[index - 1]]
        }
        if (cns.length !== 1) {
          error = true
          if (cns.length === 0) {
            errors.push(`第 ${num} 行 找不到对应「${name}」的学生`)
            continue
          }
          if (cns.length > 5) {
            // console.log(cns.map(i => i.Name))
            errors.push(`第 ${num} 行 「${name}」 指代不明确，请使用更精确的名字`)
            continue
          }
          errors.push(`第 ${num} 行 「${name}」 可能指 ${cns
            .map((i, index) => (index + 1) + '.' + i.Name).join('/')
          }，请使用更精确的名字，或${name}+数字尝试智能识别`)
          continue
        }
        const sname = cns[0].Name
        const content = values.join(' ') || (type === 'kizuna' ? `进入${sname}的好感故事` : '')
        last = { type, student: cns[0], content }
      } else {
        last = { type, content: line.substring(2).trim() }
      }
    }
  }
  if (last) messages.push(last)
  if (error) {
    return {
      error, errors
    }
  } else {
    return {
      error, messages
    }
  }
}

module.exports = textToMessages
