const asArray = require('./asArray')
const cns = asArray(require('../assets/data/cn/furniture.json'))
const furniture = asArray(require('../assets/data/jp/furniture.json'))

/**
 * @param { number } id
 * @returns { import('../types/furniture').Furniture }
 */
const getFurnitureById = (id = 0) => {
  return cns.find(i => i.Id === id) || furniture.find(i => i.Id === id)
}

module.exports = {
  getFurnitureById
}
