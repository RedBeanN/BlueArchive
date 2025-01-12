const { writeFileSync, createWriteStream, readFileSync, existsSync, mkdirSync, rmSync } = require('fs')
const { resolve, dirname } = require('path')
const { default: axios } = require('axios')
const { Agent } = require('https')
const sharp = require('sharp')
const parallel = require('../utils/parallel')
const asArray = require('../utils/asArray')

/**
 * NOTE: The SchaleDB repo stopped updating assets since Aug 20, 2024.
 * We should directly use assets from its website. Example:
 * https://schaledb.com/data/cn/students.min.json
 * https://schaledb.com/images/item/icon/currency_icon_gold.webp
 * Many file urls may be changed so we should check all files carefully.
 */
const dataRepo = 'https://github.com/SchaleDB/SchaleDB/raw/main'
const schaleApi = 'https://schaledb.com'
const dataRepoGitee = 'https://gitee.com/wangecloud/SchaleDB/raw/main'

const langs = ['cn', 'jp', 'en', 'tw', 'kr', 'th']

const downloadWithRetry = async (url = '', dist = '', force = false) => {
  const isImage = dist.endsWith('.png') || dist.endsWith('.webp')
  // Convert webp to png if necessary
  const imageNeedConvert = isImage && dist.slice(-4) !== url.slice(-4)
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
        httpsAgent: new Agent({ rejectUnauthorized: false }),
        timeout: 30_000,
      })
      const stream = createWriteStream(dist)
      if (imageNeedConvert) {
        if (dist.endsWith('png')) {
          data.pipe(sharp().png())
        } else if (dist.endsWith('webp')) {
          data.pipe(sharp().webp())
        } else if (dist.endsWith('jpg')) {
          data.pipe(sharp().jpeg())
        } else {
          console.log(`Warning: Expect converting image but extname is not available for ${dist}`)
        }
      }
      data.pipe(stream)
      await new Promise((resolve, reject) => {
        stream.on('close', async () => {
          try {
            if (isImage) {
              // Check if image is good for sharp
              await sharp(dist).toBuffer()
            } else {
              // For gitee: some files may banned and gitee returns a file with texts
              // "The content may contain violation information"
              // ... f**k gitee
              if (url.includes('gitee')) {
                const raw = readFileSync(dist, 'utf-8')
                if (raw.includes('The content may contain violation')) {
                  reject('Gitee Violation')
                }
              }
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
      if (e === 'Gitee Violation') {
        break
      }
      count++
    }
  }
  console.error(`Failed to download ${url} after ${max} retries.`)
  return false
}

let isGithubOk = true
const tryWithMirror = async (path = '', dist = '', force = false) => {
  const githubUrl = dataRepo + path
  const giteeUrl = dataRepoGitee + path
  const schaleUrl = schaleApi + path
  const schaleRes = await downloadWithRetry(schaleUrl, dist, force)
  if (schaleRes) {
    console.log(`Downloaded ${path} from schale`)
    return schaleRes
  }
  if (!isGithubOk) {
    // Just directly try gittee if github is not available
    return await downloadWithRetry(giteeUrl, dist, force)
  }

  // console.log('Trying with Github')
  const res = await downloadWithRetry(githubUrl, dist, force)
  
  if (res) {
    return res
  } else {
    console.log('Warning: Github is not available. Trying with gitee.')
    isGithubOk = false
    return await downloadWithRetry(giteeUrl, dist, force)
  }
}

const syncData = async (log = () => {}) => {
  const start = Date.now()
  // Set this to false for using gitee
  isGithubOk = false
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
      const path = `/data/${lang}/${file}.json`
      const dist = resolve(__dirname, `../assets/data/${lang}/${file}.json`)
      if (await tryWithMirror(path, dist, true)) {
        log('Downloaded', file)
      }
    }, files.length)
  }
  /** @type { import('../types/student').Student[] } */
  const jpData = asArray(JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/students.json'), 'utf-8')))
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
    if (!s || !s.Id) {
      log(`${s} not available. ${key}`)
      continue
    }
    n++
    // const texture = s.CollectionTexture
    const texture = s.PathName
    const devName = s.DevName
    const id = s.Id
    const localIcon = resolve(__dirname, `../assets/icons/${texture}.png`)
    const remoteIcon = `/images/student/icon/${id}.webp`
    const localPortrait = resolve(__dirname, `../assets/portraits/${devName}.webp`)
    const remotePortrait = `/images/student/portrait/${id}.webp`
    if (await tryWithMirror(remoteIcon, localIcon)) {
      log(`Icon: ${texture} ${s.Name}`)
    }
    if (await tryWithMirror(remotePortrait, localPortrait)) {
      log(`Portrait: ${devName} ${s.Name}`)
    }
    log(`Students: (${n}/${jpData.length})`)
    if (!schools.includes(s.School)) schools.push(s.School)
    if (!weapons.includes(s.WeaponImg)) weapons.push(s.WeaponImg)
    if (s.Gear && s.Gear.Name) {
      if (!gears.includes(id)) gears.push(id)
    }
    asArray(s.Skills).forEach(s => {
      if (s.Icon && !skills.includes(s.Icon)) skills.push(s.Icon)
    })
  }
  // console.log(skills.length)

  // School icons
  for (const s of schools) {
    const local = resolve(__dirname, `../assets/schools/${s}.png`)
    const schalePath = `/images/schoolicon/${s}.png`
    const remotePath = `/images/schoolicon/School_Icon_${s.toUpperCase()}_W.png`
    if (await tryWithMirror(schalePath, local)) {
      log(`School: ${s}`)
    } else {
      if (await tryWithMirror(remotePath, local)) {
        log(`School: ${s}`)
      }
    }
  }
  // console.log('School done')

  // Weapon icons
  await parallel(weapons, async w => {
    const local = resolve(__dirname, `../assets/weapons/${w}.png`)
    const remotePath = `/images/weapon/${w}.webp`
    if (await tryWithMirror(remotePath, local)) {
      log(`Weapon: ${w}`)
    }
  }, 10)
  // console.log('Weapon done')
  await parallel(gears, async w => {
    const local = resolve(__dirname, `../assets/gears/${w}.png`)
    const remotePath = `/images/gear/icon/${w}.webp`
    if (await tryWithMirror(remotePath, local)) {
      log(`Gear: ${w}`)
    }
  }, 10)
  // console.log('Gear done')
  await parallel(skills, async w => {
    const local = resolve(__dirname, `../assets/skills/${w}.png`)
    // console.log(local, existsSync(local))
    const remotePath = `/images/skill/${w}.webp`
    if (await tryWithMirror(remotePath, local)) {
      log(`Skill: ${w}`)
    }
  }, 10)
  // console.log('Skill done')

  // equipment icons
  const equips = ['Badge', 'Bag', 'Charm', 'Gloves', 'Hairpin', 'Hat', 'Necklace', 'Shoes', 'Watch']
  await parallel(equips, async e => {
    const local = resolve(__dirname, `../assets/equipments/${e}.png`)
    const remotePath = `/images/equipment/icon/equipment_icon_${e.toLowerCase()}_tier8.png`
    if (await tryWithMirror(remotePath, local)) {
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
    const remotePath = `/images/staticon/Stat_${s}.png`
    if (await tryWithMirror(remotePath, local)) {
      log(`StatIcon: ${s}`)
    }
  })

  // Items
  const jpItemData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/items.json'), 'utf-8'))
  await parallel(jpItemData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/items/${Id}.png`)
    const remotePath = `/images/item/icon/${Icon}.webp`
    if (await tryWithMirror(remotePath, local)) {
      log(`Item: ${Id}. ${Name}`)
    }
  }, 10)
  
  // Furnitures
  const jpFurnitureData = JSON.parse(readFileSync(resolve(__dirname, '../assets/data/jp/furniture.json'), 'utf-8'))
  await parallel(jpFurnitureData, async item => {
    const { Id, Icon, Name } = item
    const local = resolve(__dirname, `../assets/furnitures/${Id}.png`)
    const remotePath = `/images/furniture/icon/${Icon}.webp`
    if (await tryWithMirror(remotePath, local)) {
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
    const remotePath = `/images/ui/${Icon}.png`
    if (await tryWithMirror(remotePath, local)) {
      log(`UI: ${Name} ${Icon}`)
    }
  })

  // Others
  // REMOVED: This is not available in remote repo and we use local file now.
  // const others = [
  //   { Name: 'Credits', Icon: 'currency_icon_gold' },
  // ]
  // await parallel(others, async ({ Name, Icon }) => {
  //   const local = resolve(__dirname, `../assets/others/${Name}.png`)
  //   const remotePath = `/images/${Icon}.png`
  //   if (await tryWithMirror(remotePath, local)) {
  //     log(`Other: ${Name} ${Icon}`)
  //   }
  // })

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
