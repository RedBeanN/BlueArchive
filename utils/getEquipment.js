const asArray = require('./asArray')

const equipments = asArray(require('../assets/data/jp/equipment.json'))

const getEquipment = (category = '', tier = 9) => {
  const eq = equipments.find(i => i.Category === category && i.Tier === tier)
  if (eq) return eq
  if (tier > 7) {
    return getEquipment(category, tier - 1)
  }
}

module.exports = getEquipment
