const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')

const localizationMap = new Map()
/**
 * @function loadLocalize
 * @param { 'cn'|'jp'|'en'|'tw'|'kr'|'th'|'vi' } lang
 */
const loadLocalize = lang => {
  if (localizationMap.has(lang)) return localizationMap.get(lang)
  const langFile = resolve(__dirname, `../assets/data/${lang}/localization.json`)
  if (!existsSync(langFile)) {
    localizationMap.set(lang, null)
  } else {
    const data = JSON.parse(readFileSync(langFile, 'utf-8'))
    localizationMap.set(lang, data)
  }
  return localizationMap.get(lang)
}

const messages = require('./i18n.json')
const i18n = (text = '', lang = 'cn') => {
  const match = messages[lang]?.[text]
  if (match) return match
  if (lang !== 'jp') {
    const fallback = messages.jp[text]
    if (fallback) return fallback
  }
  return text
}

/**
 * @function localize
 * @param { string } key
 * @param { string } value
 * @param { 'cn'|'jp'|'en'|'tw'|'kr'|'th'|'vi' } lang
 * @returns { string }
 */
const localize = (key, value, lang) => {
  if (key === 'i18n') {
    return i18n(value, lang)
  }
  const data = loadLocalize(lang)
  if (!data) {
    console.warn(`Cannot load localization file for ${lang}`)
    return value
  }
  if (!data[key]) {
    console.warn(`Cannot find "${key}" in ${lang}`)
    return value
  }
  if (!data[key][value]) {
    console.warn(`Cannot get "${value}" from "${key}" in ${lang}`)
    return value
  }
  return data[key][value]
}
module.exports = localize
