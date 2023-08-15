const equipments = require('../assets/data/jp/equipment.json')

const getEquipment = (category = '', tier = 8) => {
  return equipments.find(i => i.Category === category && i.Tier === tier)
}

module.exports = getEquipment
