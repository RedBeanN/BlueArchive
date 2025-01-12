/**
 * Most codes of this file are from https://github.com/lonqie/SchaleDB/blob/main/js/common.js .
 * RedBeanN copied parts of the file for computing student stats.
 *
 * Some methods of classes are not available since many util functions are not copied here.
 */

function getWeaponStats (student, level) {
  let weaponStats = { MaxHP: 0, AttackPower: 0, HealPower: 0 }
  let levelscale = (level - 1) / 99
  if (student.Weapon.StatLevelUpType == 'Standard')
    levelscale = levelscale.toFixed(4)
  weaponStats['AttackPower'] = Math.round(
    student.Weapon.AttackPower1 +
      (student.Weapon.AttackPower100 - student.Weapon.AttackPower1) * levelscale
  )
  weaponStats['MaxHP'] = Math.round(
    student.Weapon.MaxHP1 +
      (student.Weapon.MaxHP100 - student.Weapon.MaxHP1) * levelscale
  )
  weaponStats['HealPower'] = Math.round(
    student.Weapon.HealPower1 +
      (student.Weapon.HealPower100 - student.Weapon.HealPower1) * levelscale
  )
  return weaponStats
}

const striker_bonus_coefficient = {
  MaxHP: 0.1,
  AttackPower: 0.1,
  DefensePower: 0.05,
  HealPower: 0.05
}

class MathHelper {
  static clamp (value, min, max) {
    return Math.min(Math.max(value, min), max)
  }
  static toFixedFloat (value, maxPrecision) {
    return parseFloat(value.toFixed(maxPrecision))
  }
  static extractNumber (string) {
    let result = parseInt(string.replace(/[^0-9]/g))
    console.log(result)
    return isNaN(result) ? 0 : result
  }
  static formatDuration (seconds) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}:${`${seconds % 60}`.padStart(2, '0')}`
  }
}
/**
 * @class CharacterStats
 */
class CharacterStats {
  /**
   * @constructor
   * @param { import('../types/student').Student } character
   * @param { number } level Student level
   * @param { number } stargrade Usually is `character.StarGrade` but can be up to... 8?
   * @param { number[][] } transcendence This is only used by enemies
   * @param { number } scaletype
   */
  constructor (character, level, stargrade, transcendence = [], scaletype = 0) {
    this.stats = {}
    let levelscale
    if (scaletype == 0) {
      levelscale = ((level - 1) / 99).toFixed(4)
    } else if (scaletype == 1) {
      levelscale = CharacterStats.getTimeAttackLevelScale(level)
    }

    if (transcendence.length == 0) {
      transcendence = [
        [0, 1000, 1200, 1400, 1700],
        [0, 500, 700, 900, 1400],
        [0, 750, 1000, 1200, 1500]
      ]
    }

    let transcendenceAttack = 1
    let transcendenceHP = 1
    let transcendenceHeal = 1

    for (let i = 0; i < stargrade; i++) {
      transcendenceAttack += transcendence[0][i] / 10000
      transcendenceHP += transcendence[1][i] / 10000
      transcendenceHeal += transcendence[2][i] / 10000
    }

    let MaxHP = Math.ceil(
      (
        Math.round(
          (
            character.MaxHP1 +
            (character.MaxHP100 - character.MaxHP1) * levelscale
          ).toFixed(4)
        ) * transcendenceHP
      ).toFixed(4)
    )
    let AttackPower = Math.ceil(
      (
        Math.round(
          (
            character.AttackPower1 +
            (character.AttackPower100 - character.AttackPower1) * levelscale
          ).toFixed(4)
        ) * transcendenceAttack
      ).toFixed(4)
    )
    let DefensePower = Math.round(
      (
        character.DefensePower1 +
        (character.DefensePower100 - character.DefensePower1) * levelscale
      ).toFixed(4)
    )
    let HealPower = Math.ceil(
      (
        Math.round(
          (
            character.HealPower1 +
            (character.HealPower100 - character.HealPower1) * levelscale
          ).toFixed(4)
        ) * transcendenceHeal
      ).toFixed(4)
    )

    let DefensePenetration = 0
    if (character.DefensePenetration100 !== undefined) {
      DefensePenetration = Math.round(
        (
          character.DefensePenetration1 +
          (character.DefensePenetration100 - character.DefensePenetration1) *
            levelscale
        ).toFixed(4)
      )
    }

    this.level = level
    this.terrain = {
      Street:
        character.StreetBattleAdaptation !== undefined
          ? character.StreetBattleAdaptation
          : 2,
      Outdoor:
        character.OutdoorBattleAdaptation !== undefined
          ? character.OutdoorBattleAdaptation
          : 2,
      Indoor:
        character.IndoorBattleAdaptation !== undefined
          ? character.IndoorBattleAdaptation
          : 2
    }

    this.activeBuffs = {}
    this.bulletType = character.BulletType
    this.armorType = character.ArmorType
    this.equipment = character.Equipment ? character.Equipment : []

    this.stats['MaxHP'] = [MaxHP, 0, 1, 0]
    this.stats['AttackPower'] = [AttackPower, 0, 1, 0]
    this.stats['DefensePower'] = [DefensePower, 0, 1, 0]
    this.stats['HealPower'] = [HealPower, 0, 1, 0]
    this.stats['AccuracyPoint'] = [character.AccuracyPoint, 0, 1, 0]
    this.stats['DodgePoint'] = [character.DodgePoint, 0, 1, 0]
    this.stats['CriticalPoint'] = [character.CriticalPoint, 0, 1, 0]
    this.stats['CriticalDamageRate'] = [character.CriticalDamageRate, 0, 1, 0]
    this.stats['CriticalChanceResistPoint'] = [100, 0, 1, 0]
    this.stats['CriticalDamageResistRate'] = [5000, 0, 1, 0]
    this.stats['StabilityPoint'] = [character.StabilityPoint, 0, 1, 0]
    this.stats['StabilityRate'] = [2000, 0, 1, 0]
    this.stats['AmmoCount'] = [character.AmmoCount, 0, 1, 0]
    this.stats['AmmoCost'] = [character.AmmoCost, 0, 1, 0]
    this.stats['Range'] = [character.Range, 0, 1, 0]
    this.stats['RegenCost'] = [character.RegenCost, 0, 1, 0]
    this.stats['DamageRatio'] = [10000, 0, 1, 0]
    this.stats['DamagedRatio'] = [10000, 0, 1, 0]
    this.stats['HealEffectivenessRate'] = [10000, 0, 1, 0]
    this.stats['OppressionPower'] = [100, 0, 1, 0]
    this.stats['OppressionResist'] = [100, 0, 1, 0]
    this.stats['AttackSpeed'] = [10000, 0, 1, 0]
    this.stats['BlockRate'] = [0, 0, 1, 0]
    this.stats['DefensePenetration'] = [DefensePenetration, 0, 1, 0]
    this.stats['MoveSpeed'] = [200, 0, 1, 0]
    this.stats['EnhanceExplosionRate'] = [10000, 0, 1, 0]
    this.stats['EnhancePierceRate'] = [10000, 0, 1, 0]
    this.stats['EnhanceMysticRate'] = [10000, 0, 1, 0]
    this.stats['ExtendBuffDuration'] = [10000, 0, 1, 0]
    this.stats['ExtendDebuffDuration'] = [10000, 0, 1, 0]
    this.stats['ExtendCCDuration'] = [10000, 0, 1, 0]

    if (stargrade >= 5) {
      Object.entries(getWeaponStats(character, 50)).forEach(([key, value]) => {
        this.addBuff(key, value)
      })
    }
  }

  addBuff (stat, amount, separatedFlat = false) {
    let stat_split = stat.split('_')
    if (stat_split.length > 1) {
      if (stat_split[1] == 'Base') {
        if (separatedFlat) {
          this.stats[stat_split[0]][3] += amount
        } else {
          this.stats[stat_split[0]][1] += amount
        }
      } else if (stat_split[1] == 'Coefficient') {
        this.stats[stat_split[0]][2] += amount / 10000
      }
    } else {
      this.stats[stat_split[0]][1] += amount
    }
  }

  /**
   * Adds the specified stat from another instance of CharacterStats as a flat buff
   * @param {CharacterStats} chStats the instance of CharacterStats to add from
   * @param {*} stat the name of the stat to add
   * @param {*} coefficient the amount of the stat to add
   */
  addCharacterStatsAsBuff (chStats, stat, coefficient) {
    this.stats[stat][1] += Math.round(
      chStats.getTotal(stat) * (coefficient / 10000)
    )
  }

  /**
   * Calculates the final total of a stat with all flat and percentage buffs
   * @param {string} stat The name of the stat
   * @returns
   */
  getTotal (stat) {
    let applyBuffCap = true
    let allowNegative = false

    if (stat == 'DamagedRatio') {
      applyBuffCap = false
      allowNegative = true
    }

    const statBase = this.stats[stat][0]
    const flatBonus = this.stats[stat][1]
    const coefficientBonus = applyBuffCap
      ? Math.max(this.stats[stat][2], 0.2)
      : this.stats[stat][2]
    const nonMultiFlatBonus = this.stats[stat][3]

    const statTotal =
      Math.round(((statBase + flatBonus) * coefficientBonus).toFixed(4)) +
      nonMultiFlatBonus

    return allowNegative ? statTotal : Math.max(statTotal, 0)
  }

  /**
   * Calculates and returns the final total of a stat as a locale-formatted string
   * @param {*} stat
   * @returns
   */
  getTotalString (stat, formatStatCap = false) {
    let total = this.getTotal(stat)
    let result = ''
    if (stat == 'DamagedRatio') {
      result = ((total - 10000) / 100).toFixed(0).toLocaleString() + '%'
    } else if (CharacterStats.isRateStat(stat)) {
      result = (total / 100).toFixed(0).toLocaleString() + '%'
    } else {
      result = total.toLocaleString()
    }
    if (stat != 'DamagedRatio' && formatStatCap && this.stats[stat][2] <= 0.2)
      result = `<span class="stat-cap">${result}</span>`
    return result
  }

  /**
   * Returns the base stat as a locale-formatted string
   * @param {*} stat
   * @returns
   */
  getBaseString (stat) {
    let total = this.stats[stat][0]
    if (stat == 'DamagedRatio') {
      return Math.floor((total - 10000) / 100).toLocaleString() + '%'
    } else if (CharacterStats.isRateStat(stat)) {
      return (total / 100).toFixed(0).toLocaleString() + '%'
    } else {
      return total.toLocaleString()
    }
  }

  setBase (stat, value) {
    this.stats[stat][0] = value
  }

  /**
   * Returns the flat buff as a locale-formatted string
   * @param {*} stat
   * @returns
   */
  getFlatString (stat) {
    const total = this.stats[stat][1] + this.stats[stat][3]
    const sign = total >= 0 ? '+' : ''
    return sign + total.toLocaleString()
  }

  /**
   * Returns the coefficient percent buff as a locale-formatted string
   * @param {*} stat
   * @returns
   */
  getCoefficientString (stat) {
    let val = (Math.max(this.stats[stat][2], 0.2) - 1) * 100
    const sign = val >= 0 ? '+' : ''
    //hide decimal when > 100%
    val = Math.abs(val) < 100 ? val.toFixed(1) : val.toFixed(0)
    return sign + parseFloat(val).toLocaleString() + '%'
  }

  getStrikerBonus (stat) {
    return Math.floor(this.getTotal(stat) * striker_bonus_coefficient[stat])
  }

  getStabilityMinDamageMod () {
    let stability = this.getTotal('StabilityPoint')
    return MathHelper.clamp(
      stability / (stability + 1000) + this.getTotal('StabilityRate') / 10000,
      0,
      1
    )
  }

  getStabilityMinDamage () {
    return (
      MathHelper.toFixedFloat(this.getStabilityMinDamageMod() * 100, 2) + '%'
    )
  }

  getDefenseDamageReductionMod (penetrationBase = 0, penetrationRate = 10000) {
    let defense = Math.max(
      (this.getTotal('DefensePower') - penetrationBase) *
        (penetrationRate / 10000),
      0
    )
    return 10000000 / (defense * 6000 + 10000000)
  }

  getDefenseDamageReduction () {
    return (
      parseFloat(((1 - this.getDefenseDamageReductionMod()) * 100).toFixed(2)) +
      '%'
    )
  }

  getCriticalRate (critRes) {
    const crit = this.getTotal('CriticalPoint')
    return MathHelper.clamp(
      1 - 4000000 / (Math.max(crit - critRes, 0) * 6000 + 4000000),
      0,
      1
    )
  }

  getCriticalHitChanceString (critRes) {
    return `${MathHelper.toFixedFloat(this.getCriticalRate(critRes) * 100, 2)}%`
  }

  getHitChance (evade) {
    const hit = this.getTotal('AccuracyPoint')
    return MathHelper.clamp(700 / Math.max(evade - hit + 700, 700), 0, 1)
  }

  getHitChanceString (evade) {
    const hit = this.getTotal('AccuracyPoint')
    return `${MathHelper.toFixedFloat(this.getHitChance(evade) * 100, 2)}%`
  }

  static isRateStat (stat) {
    return (
      stat.slice(-4) == 'Rate' ||
      stat.startsWith('AttackSpeed') ||
      stat.startsWith('DamagedRatio')
    )
  }

  static getTimeAttackLevelScale (level) {
    if (level <= 1) {
      return 0
    } else if (level == 2) {
      return 0.0101
    } else if (level <= 24) {
      return 0.0707
    } else if (level == 25) {
      return 0.0808
    } else if (level <= 39) {
      return 0.1919
    } else if (level == 40) {
      return 0.202
    } else if (level <= 64) {
      return 0.4444
    } else if (level == 65) {
      return 0.4545
    } else if (level <= 77) {
      return 0.7172
    } else if (level == 78) {
      return 0.7273
    } else if (level >= 79) {
      return ((level - 1) / 99).toFixed(4)
    }
  }

  /**
   * Calculates the maximum damage dealt to a target by this character
   * @param {CharacterStats} target
   */
  calculateHealing (healRate) {
    const totalHeal = this.getTotal('HealPower')
    return parseInt(totalHeal * healRate)
  }
}
module.exports = CharacterStats
