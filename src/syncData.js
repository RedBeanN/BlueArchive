const { writeFileSync, createWriteStream, readFileSync, existsSync, mkdirSync, rmSync } = require('fs')
const { resolve, dirname } = require('path')
const { default: axios } = require('axios')
const { Agent } = require('https')
const sharp = require('sharp')
const parallel = require('../utils/parallel')

const dataRepo = 'https://github.com/lonqie/SchaleDB'

const langs = ['cn', 'jp', 'en', 'tw', 'kr', 'th']

const downloadWithRetry = async (url = '', dist = '', force = false) => {
  const isImage = dist.endsWith('.png') || dist.endsWith('.webp')
  const max = 5
  let count = 0
  if (!force && existsSync(dist)) {
    // console.log('existed', dist)
    return false
  }
  const dir = dirname(dist)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  while (count < max) {
    try {
      const { data } = await axios.get(url, {
        responseType: 'stream',
        httpsAgent: new Agent({ rejectUnauthorized: false })
      })
      const stream = createWriteStream(dist)
      data.pipe(stream)
      await new Promise((resolve, reject) => {
        stream.on('close', async () => {
          try {
            if (isImage) {
              // Check if image is good for sharp
              await sharp(dist).toBuffer()
            }
            resolve()
          } catch (e) {
            console.warn(`Failed to check downloaded file ${dist}`)
            // If download failed we should remove the downloaded file
            rmSync(dist)
            reject(e)
          }
        })
        data.on('error', reject)
        stream.on('error', reject)
      })
      return true
    } catch (e) {
      console.warn(`[${count}/${max}] Failed to download ${url}. Error:`, e?.message || e)
      count++
    }
  }
  console.error(`Failed to download ${url} after ${max} retries.`)
  return false
}

const syncData = async (log = () => {}) => {
  const start = Date.now()
  // https://github.com/lonqie/SchaleDB/raw/main/data/cn/students.json
  const files = [
    'students',
    'localization',
    'equipment',
    'items',
    'furniture',
  ]
  for (const lang of langs) {
    await parallel(files, async file => {
      const url = `${dataRepo}/raw/main/data/${lang}/${file}.json`
      const dist = resolve(__dirname, `../assets/data/${lang}/${file}.json`)
      if (await downloadWithRetry(url, dist, true)) {
        log(`[${lang}] Downloaded`, file)
      }
    }, files.length)
  }
  /** @type { import('../types/student').Student[] } */
  const jpData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/students.json'), 'utf-8'))
  let n = 0
  /** @type { string[] } */
  const schools = []
  /** @type { string[] } */
  const weapons = []
  /** @type { string[] } */
  const gears = []
  /** @type { string[] } */
  const skills = []
  for (const s of jpData) {
    n++
    // const texture = s.CollectionTexture
    const texture = s.PathName
    const devName = s.DevName
    const id = s.Id
    const localIcon = resolve(__dirname, `../assets/icons/${texture}.png`)
    const remoteIcon = `${dataRepo}/raw/main/images/student/icon/${id}.webp`
    const localPortrait = resolve(__dirname, `../assets/portraits/${devName}.png`)
    const remotePortrait = `${dataRepo}/raw/main/images/student/portrait/${id}.webp`
    if (await downloadWithRetry(remoteIcon, localIcon)) {
      log(`Icon: ${texture} ${s.Name}`)
    }
    if (await downloadWithRetry(remotePortrait, localPortrait)) {
      log(`Portrait: ${devName} ${s.Name}`)
    }
    log(`Students: (${n}/${jpData.length})`)
    if (!schools.includes(s.School)) schools.push(s.School)
    if (!weapons.includes(s.WeaponImg)) weapons.push(s.WeaponImg)
    if (s.Gear && s.Gear.Name) {
      if (!gears.includes(id)) gears.push(id)
    }
    s.Skills.forEach(s => {
      if (s.Icon && !skills.includes(s.Icon)) skills.push(s.Icon)
    })
  }
  // console.log(skills.length)

  // School icons
  for (const s of schools) {
    const local = resolve(__dirname, `../assets/schools/${s}.png`)
    const remote = `${dataRepo}/raw/main/images/schoolicon/School_Icon_${s.toUpperCase()}_W.png`
    if (await downloadWithRetry(remote, local)) {
      log(`School: ${s}`)
    }
  }
  // console.log('School done')

  // Weapon icons
  await parallel(weapons, async w => {
    const local = resolve(__dirname, `../assets/weapons/${w}.png`)
    const remote = `${dataRepo}/raw/main/images/weapon/${w}.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Weapon: ${w}`)
    }
  }, 10)
  // console.log('Weapon done')
  await parallel(gears, async w => {
    const local = resolve(__dirname, `../assets/gears/${w}.png`)
    const remote = `${dataRepo}/raw/main/images/gear/icon/${w}.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Gear: ${w}`)
    }
  }, 10)
  // console.log('Gear done')
  await parallel(skills, async w => {
    const local = resolve(__dirname, `../assets/skills/${w}.png`)
    // console.log(local, existsSync(local))
    const remote = `${dataRepo}/raw/main/images/skill/${w}.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Skill: ${w}`)
    }
  }, 10)
  // console.log('Skill done')

  // equipment icons
  const equips = ['Badge', 'Bag', 'Charm', 'Gloves', 'Hairpin', 'Hat', 'Necklace', 'Shoes', 'Watch']
  await parallel(equips, async e => {
    const local = resolve(__dirname, `../assets/equipments/${e}.png`)
    const remote = `${dataRepo}/raw/main/images/equipment/icon/equipment_icon_${e.toLowerCase()}_tier8.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Equipment: ${e}`)
    }
  })
  // console.log('Equip done')

  const statIcons = [
    'AccuracyPoint', 'BlockRate', 'CriticalPoint', 'DodgePoint', 'HealPower', 'OppressionResist',
    'AmmoCount', 'CriticalChanceResistPoint', 'DamagedRatio', 'GroggyGauge', 'MaxHP', 'Range',
    'AttackPower', 'CriticalDamageRate', 'DefensePenetration', 'GroggyTime', 'MoveSpeed', 'RegenCost', 'AttackSpeed',
    'CriticalDamageResistRate', 'DefensePower', 'HealEffectivenessRate', 'OppressionPower', 'StabilityPoint',
  ]
  await parallel(statIcons, async s => {
    const local = resolve(__dirname, `../assets/stats/${s}.png`)
    const remote = `${dataRepo}/raw/main/images/staticon/Stat_${s}.png`
    if (await downloadWithRetry(remote, local)) {
      log(`StatIcon: ${s}`)
    }
  })

  // Items
  const jpItemData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/items.json'), 'utf-8'))
  await parallel(jpItemData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/items/${Id}.png`)
    const remote = `${dataRepo}/raw/main/images/item/icon/${Icon}.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Item: ${Id}. ${Name}`)
    }
  }, 10)
  
  // Furnitures
  const jpFurnitureData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/furniture.json'), 'utf-8'))
  await parallel(jpFurnitureData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/furnitures/${Id}.png`)
    const remote = `${dataRepo}/raw/main/images/furniture/icon/${Icon}.webp`
    if (await downloadWithRetry(remote, local)) {
      log(`Furniture: ${Id}. ${Name}`)
    }
  }, 10)

  // ui
  const uis = [
    { Name: 'Adapt_0', Icon: 'Ingame_Emo_AdaptresultD' },
    { Name: 'Adapt_1', Icon: 'Ingame_Emo_AdaptresultC' },
    { Name: 'Adapt_2', Icon: 'Ingame_Emo_AdaptresultB' },
    { Name: 'Adapt_3', Icon: 'Ingame_Emo_AdaptresultA' },
    { Name: 'Adapt_4', Icon: 'Ingame_Emo_AdaptresultS' },
    { Name: 'Adapt_5', Icon: 'Ingame_Emo_AdaptresultSS' },
    { Name: 'Street', Icon: 'Terrain_Street' },
    { Name: 'Outdoor', Icon: 'Terrain_Outdoor' },
    { Name: 'Indoor', Icon: 'Terrain_Indoor' },
    { Name: 'Cover', Icon: 'Combat_Icon_Cover_Ally' },
  ]
  await parallel(uis, async ui => {
    const { Name, Icon } = ui
    const local = resolve(__dirname, `../assets/ui/${Name}.png`)
    const remote = `${dataRepo}/raw/main/images/ui/${Icon}.png`
    if (await downloadWithRetry(remote, local)) {
      log(`UI: ${Name} ${Icon}`)
    }
  })

  // Others
  const others = [
    { Name: 'Credits', Icon: 'currency_icon_gold' },
  ]
  await parallel(others, async ({ Name, Icon }) => {
    const local = resolve(__dirname, `../assets/others/${Name}.png`)
    const remote = `${dataRepo}/raw/main/images/item/icon/${Icon}.png`
    if (await downloadWithRetry(remote, local)) {
      log(`Other: ${Name} ${Icon}`)
    }
  })

  return (Date.now() - start)
}

module.exports = syncData

// Sync from command line
if (require.main === module) {
  syncData((...args) => console.log('[SyncData]', ...args)).then(cost => {
    console.log(`Finish syncing data after ${cost} ms`)
    process.exit(0)
  })
}
