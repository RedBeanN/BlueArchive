const { writeFileSync, createWriteStream, readFileSync, existsSync, mkdirSync, rmSync } = require('fs')
const { resolve, dirname } = require('path')
const { default: axios } = require('axios')
const { Agent } = require('https')
const sharp = require('sharp')
const parallel = require('../utils/parallel')

const dataRepo = 'https://github.com/lonqie/SchaleDB'
const dataRepoGitee = 'https://gitee.com/wangecloud/SchaleDB'

const langs = ['cn', 'jp', 'en', 'tw', 'kr', 'th', 'vi']

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

const TryWithMirror = async (path = '', dist = '', force = false) => {
  const github_url = dataRepo + path
  const gitee_url = dataRepoGitee + path

  console.log("Trying with Github")
  let res = await downloadWithRetry(github_url, dist, force)
  
  if (res) {
    return res
  } else {
    console.log("Trying with gitee")
    return await downloadWithRetry(gitee_url, dist, force)
  }
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
      const path = `/raw/main/data/${lang}/${file}.json`
      const dist = resolve(__dirname, `../assets/data/${lang}/${file}.json`)
      if (await TryWithMirror(path, dist, true)) {
        log('Downloaded', file)
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
    const texture = s.CollectionTexture
    const devName = s.DevName
    const localIcon = resolve(__dirname, `../assets/icons/${texture}.png`)
    const remoteIcon = `/raw/main/images/student/icon/${texture}.png`
    const localPortrait = resolve(__dirname, `../assets/portraits/${devName}.webp`)
    const remotePortrait = `/raw/main/images/student/portrait/Portrait_${devName}.webp`
    if (await TryWithMirror(remoteIcon, localIcon)) {
      log(`Icon: ${texture} ${s.Name}`)
    }
    if (await TryWithMirror(remotePortrait, localPortrait)) {
      log(`Portrait: ${devName} ${s.Name}`)
    }
    log(`Students: (${n}/${jpData.length})`)
    if (!schools.includes(s.School)) schools.push(s.School)
    if (!weapons.includes(s.WeaponImg)) weapons.push(s.WeaponImg)
    if (s.Gear && s.Gear.Icon) {
      if (!gears.includes(s.Gear.Icon)) gears.push(s.Gear.Icon)
    }
    s.Skills.forEach(s => {
      if (s.Icon && !skills.includes(s.Icon)) skills.push(s.Icon)
    })
  }
  // console.log(skills.length)

  // School icons
  for (const s of schools) {
    const local = resolve(__dirname, `../assets/schools/${s}.png`)
    const remote_path = `/raw/main/images/schoolicon/School_Icon_${s.toUpperCase()}_W.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`School: ${s}`)
    }
  }
  // console.log('School done')

  // Weapon icons
  await parallel(weapons, async w => {
    const local = resolve(__dirname, `../assets/weapons/${w}.png`)
    const remote_path = `/raw/main/images/weapon/${w}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`Weapon: ${w}`)
    }
  }, 10)
  // console.log('Weapon done')
  await parallel(gears, async w => {
    const local = resolve(__dirname, `../assets/gears/${w}.png`)
    const remote_path = `/raw/main/images/gear/${w}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`Gear: ${w}`)
    }
  }, 10)
  // console.log('Gear done')
  await parallel(skills, async w => {
    const local = resolve(__dirname, `../assets/skills/${w}.png`)
    // console.log(local, existsSync(local))
    const remote_path = `/raw/main/images/skill/${w}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`Skill: ${w}`)
    }
  }, 10)
  // console.log('Skill done')

  // equipment icons
  const equips = ['Badge', 'Bag', 'Charm', 'Gloves', 'Hairpin', 'Hat', 'Necklace', 'Shoes', 'Watch']
  await parallel(equips, async e => {
    const local = resolve(__dirname, `../assets/equipments/${e}.png`)
    const remote_path = `/raw/main/images/equipment/Equipment_Icon_${e}_Tier8.png`
    if (await TryWithMirror(remote_path, local)) {
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
    const remote_path = `/raw/main/images/staticon/Stat_${s}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`StatIcon: ${s}`)
    }
  })

  // Items
  const jpItemData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/items.json'), 'utf-8'))
  await parallel(jpItemData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/items/${Id}.png`)
    const remote_path = `/raw/main/images/items/${Icon}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`Item: ${Id}. ${Name}`)
    }
  }, 10)
  
  // Furnitures
  const jpFurnitureData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/furniture.json'), 'utf-8'))
  await parallel(jpFurnitureData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/furnitures/${Id}.png`)
    const remote_path = `/raw/main/images/furniture/${Icon}.png`
    if (await TryWithMirror(remote_path, local)) {
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
    const remote_path = `/raw/main/images/ui/${Icon}.png`
    if (await TryWithMirror(remote_path, local)) {
      log(`UI: ${Name} ${Icon}`)
    }
  })

  // Others
  const others = [
    { Name: 'Credits', Icon: 'items/Currency_Icon_Gold' },
  ]
  await parallel(others, async ({ Name, Icon }) => {
    const local = resolve(__dirname, `../assets/others/${Name}.png`)
    const remote_path = `/raw/main/images/${Icon}.png`
    if (await TryWithMirror(remote_path, local)) {
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
