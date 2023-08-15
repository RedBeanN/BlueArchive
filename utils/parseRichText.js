const localize = require('./localize')
/**
 * @function parseRichText
 * @param { object } option
 * @param { string } option.text
 * @param { string[][] } option.params
 * @param { number } [option.level]
 * @param { string } [option.lang]
 */
const parseRichText = ({
  text = '',
  params = [],
  level = 10,
  lang = 'cn'
}) => {
  const b = s => localize('BuffName', 'Buff_' + s, 'cn')
  const d = s => localize('BuffName', 'Debuff_' + s, 'cn')
  const c = s => localize('BuffName', 'CC_' + s, 'cn')
  const s = v => localize('BuffName', 'Special_' + v, 'cn')
  return text.replace(/<\?(\d+)>/g, (_, v) => {
    const param = params[Number(v) - 1]
    if (!param) return ''
    const vals = param.slice(0, level).join('/')
    return `<span color="#34a4e4">${vals}</span>`
  })
  .replace(/<b\:(.+?)>/g, (_, v) => {
    // console.log(v)
    return `<span color="#ff9700">${b(v)}</span>`
  })
  //.replace(/<b(\s.+?)?>/g, 'bold').replace(/<\/b>/g, 'NOTBOLD')
  .replace(/<d\:(.+?)>/g, (_, v) => {
    return `<span color="#ff9700">${d(v)}</span>`
  })
  .replace(/<s\:(.+?)>/g, (_, v) => {
    return `<span color="#ff9700">${s(v)}</span>`
  })
  .replace(/<c\:(.+?)>/g, (_, v) => {
    return `<span color="#ff9700">${c(v)}</span>`
  })
}

module.exports = parseRichText
