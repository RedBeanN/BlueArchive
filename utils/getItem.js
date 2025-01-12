const asArray = require('./asArray')
const cns = asArray(require('../assets/data/cn/items.json'))
const items = asArray(require('../assets/data/jp/items.json'))

/**
 * @function getFavorsByTags
 * @param { string[] } tags
 * @returns { import('../types/item').FavorItem[] }
 */
const getFavorsByTags = (tags = []) => {
  return items.filter(item => {
    return item.Category === 'Favor' && item.Tags.some(tag => tags.includes(tag))
  }).map(item => {
    return cns.find(i => i.Id === item.Id) || item
  })
}
const getItemById = (id = 0) => {
  return cns.find(i => i.Id === id) || items.find(i => i.Id === id)
}

module.exports = {
  getItemById,
  getFavorsByTags,
}
