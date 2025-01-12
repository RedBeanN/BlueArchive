const { existsSync } = require('fs')
const { resolve } = require('path')
const sharp = require('sharp')
const escapeHtml = require('../utils/escapeHtml')
const { getStudentById } = require('./getStudent')
const localize = require('../utils/localize')
const CharacterStats = require('../utils/CharacterStats')
const getEquipment = require('../utils/getEquipment')
const getBoundStats = require('../utils/getBoundStats')
const { getFavorsByTags } = require('../utils/getItem')
const { getFurnitureById } = require('../utils/getFurniture')
const parseRichText = require('../utils/parseRichText')

const skillExCredits = [80000, 500000, 3000000, 10000000]
const skillCredits = [5000, 7500, 60000, 90000, 300000, 450000, 1500000, 2400000, 4000000]
const studentStatList = [
  'MaxHP', 'AttackPower', 'DefensePower', 'HealPower', 'AccuracyPoint', 'DodgePoint', 'CriticalPoint',
  'CriticalChanceResistPoint', 'CriticalDamageRate', 'CriticalDamageResistRate', 'StabilityPoint', 'Range',
  'OppressionPower', 'OppressionResist', 'HealEffectivenessRate', 'AmmoCount'
]
const numberToLarger = (n = 0) => {
  if (n < 1000) return n.toString()
  if (n < 1000_000) return Math.floor(n / 1000) + 'K'
  if (n < 1000_000_000) return Math.floor(n / 1000_000) + 'M'
  return Math.floor(n / 1000_000_000) + 'B'
}
const getBulletTypeBg = (type = '') => {
  switch (type) {
    case 'Explosion': return 'rgba(167, 12, 25, 1)'
    case 'Pierce': return 'rgba(178, 109, 31, 1)'
    case 'Mystic': return 'rgba(33, 111, 156, 1)'
    case 'Sonic': return 'rgba(148, 49, 165, 1)'
  }
}
const getArmorTypeBg = (type = '') => {
  switch (type) {
    case 'LightArmor': return 'rgba(167, 12, 25, 1)'
    case 'HeavyArmor': return 'rgba(178, 109, 31, 1)'
    case 'Unarmed': return 'rgba(33, 111, 156, 1)'
    case 'ElasticArmor': return 'rgba(148, 49, 165, 1)'
    case 'Normal': return 'rgb(72, 85, 130)'
  }
}
/**
 * @typedef { import('../types/student').Student } Student
 * @typedef { import('sharp').OverlayOptions } OverlayOptions
 */

// Preset image size
const imageWidth = 720
const pl = (w = 0) => Math.floor((imageWidth - w) / 2)
// Add opacity for background
const logo = sharp(resolve(__dirname, '../assets/logo.svg')).composite([{
  input: Buffer.from([255, 255, 255, 48]),
  raw: { width: 1, height: 1, channels: 4 },
  tile: true,
  blend: 'dest-in'
}]).png()
// Return a rectangle svg buffer with specific props
const rect = (props = '') => Buffer.from(`<svg><rect x="0" y="0" ${props} /></svg>`)

// Fonts and colors
const miSansFile = resolve(__dirname, '../assets/fonts/MiSans-Bold.ttf')
const miSans = 'MiSans Bold'
const defaultFontfile = resolve(__dirname, '../assets/fonts/ResourceHanRoundedCN.ttf')
const defaultFont = 'Resource Han Rounded CN Medium'
const black = '#2a323e'
const white = '#ecf2fb'
const grey = '#87929e'
const lightgrey = '#cdd3dc'
const blue = '#34a4e4'

// Create png image from text
const textPng = ({
  text = '',
  fontSize = 32,
  color = black,
  align = 'left',
  maxWidth = imageWidth,
  font = defaultFont,
  fontfile = defaultFontfile,
}) => {
  const png = sharp({
    text: {
      text: `<span color="${color}" size="${fontSize}pt">${escapeHtml(text)}</span>`,
      font, fontfile,
      dpi: 72,
      width: maxWidth,
      rgba: true,
      align,
      wrap: 'char',
    }
  }).png()
  // if (!meta) return png.toBuffer()
  return png
}

/**
 * @typedef { (
 *   student: Student,
 *   draw: (...args: OverlayOptions[] ) => any,
 *   move: (h?: number) => number,
 *   translate: (key: string, value: string) => string,
 * ) => Promise<any> } DrawFunction
 */

/** @type { DrawFunction } */
const drawBaseInfo = async (s, draw, move, t) => {
  const schoolIcon = resolve(__dirname, `../assets/schools/${s.School}.png`)
  const iconSize = 128
  if (existsSync(schoolIcon)) {
    const icon = sharp(schoolIcon).resize(iconSize, iconSize).png()
    const inverted = sharp({
      create: {
        width: iconSize,
        height: iconSize,
        channels: 4,
        background: '#000',
      }
    }).composite([{
      input: await icon.toBuffer(),
      blend: 'dest-in'
    }]).png()
    draw({
      input: await inverted.toBuffer(),
      left: imageWidth - iconSize - 16,
      top: move(),
    })
  }

  // Draw tags
  let left = 16
  const tagHeight = 46
  if (s.StarGrade) {
    const stars = textPng({
      text: '★'.repeat(s.StarGrade),
      fontSize: 28,
    })
    const meta = await stars.metadata()
    const container = rect(`width="${meta.width + 28}" height="${tagHeight}" rx="28" ry="28" fill="${lightgrey}"`)
    draw({
      input: container,
      left: left,
      top: move()
    }, {
      input: await stars.toBuffer(),
      left: left + 16,
      top: move() + Math.floor((tagHeight - meta.height) / 2)
    })
    left += meta.width + 40
  }
  const squad = s.SquadType === 'Main' ? t('squard_main') : s.SquadType === 'Support' ? t('squard_support') : ''
  if (squad) {
    const bgColor = s.SquadType === 'Main' ? '#cc1a25' : '#006bff'
    const sq = textPng({
      text: squad,
      fontSize: 28,
      color: white,
    })
    const meta = await sq.metadata()
    const container = rect(`width="${meta.width + 48}" height="${tagHeight}" rx="28" ry="28" fill="${bgColor}"`)
    draw({
      input: container,
      left: left,
      top: move()
    }, {
      input: await sq.toBuffer(),
      left: left + 24,
      top: move() + Math.floor((tagHeight - meta.height) / 2)
    })
    left += meta.width + 56
  }
  move(tagHeight + 8)

  left = 16
  const tags = [
    { tag: t('TacticRole', s.TacticRole) },
    { tag: t('BulletType', s.BulletType), bgColor: getBulletTypeBg(s.BulletType) },
    { tag: t('ArmorType', s.ArmorType), bgColor: getArmorTypeBg(s.ArmorType) },
    { tag: s.Position === 'Back' ? t('pos_back') : s.Position === 'Front' ? t('pos_front') : t('pos_mid') },
  ]
  for (const { tag, bgColor } of tags) {
    const bg = bgColor ? bgColor : lightgrey
    const color = bgColor ? white : black
    const text = textPng({ text: tag, fontSize: 28, color })
    const meta = await text.metadata()
    if ((left + meta.width + 48) > (imageWidth - iconSize - 36)) {
      left = 16
      move(tagHeight)
    }
    const container = rect(`width="${meta.width + 40}" height="${tagHeight}" rx="24" ry="24" fill="${bg}"`)
    draw({
      input: container,
      left: left,
      top: move()
    }, {
      input: await text.toBuffer(),
      left: left + 20,
      top: move() + Math.floor((tagHeight - meta.height) / 2)
    })
    left += meta.width + 48
  }
  if (left !== 16) move(tagHeight + 8)
}

/** @type { DrawFunction } */
const drawEquipInfo = async (s, draw, move, t) => {
  // Weapon
  const weaponFile = resolve(__dirname, `../assets/weapons/${s.WeaponImg}.png`)
  const infoHeight = 96
  if (existsSync(weaponFile)) {
    const cw = 320
    const weaponRaw = sharp(weaponFile)
    let { width, height } = await weaponRaw.metadata()
    if (width > cw) {
      height = Math.floor(cw / width * height)
      width = cw
    }
    if (height > infoHeight) {
      width = Math.floor(infoHeight / height * width)
      height = infoHeight
    }
    // console.log(width, height)
    const container = rect(`width="${cw + 16}" height = "${infoHeight + 16}" rx="12" ry="12" fill="${lightgrey}aa"`)
    draw({
      input: container,
      left: 16,
      top: move()
    }, {
      input: await weaponRaw.resize(width, height).png().toBuffer(),
      left: 24 + Math.floor((cw - width) / 2),
      top: move() + 8 + Math.floor((infoHeight - height) / 2)
    }, {
      input: await textPng({ text: s.WeaponType, color: black, fontSize: 24 }).toBuffer(),
      left: 28 + (s.Cover ? 20 : 0),
      top: move() + 8
    })
    if (s.Cover) {
      draw({
        input: await sharp(resolve(__dirname, '../assets/ui/Cover.png')).resize(22, 22).toBuffer(),
        left: 20,
        top: move() + 8
      })
    }
  }
  const eicons = []
  for (const e of s.Equipment) {
    eicons.push(sharp(resolve(__dirname, `../assets/equipments/${e}.png`)).resize(72, 72))
  }
  if (s.Gear && s.Gear.Icon) {
    eicons.push(sharp(resolve(__dirname, `../assets/gears/${s.Gear.Icon}.png`)).resize(72, 72))
  }
  if (eicons.length) {
    draw({
      input: rect(`width="${336}" height = "${infoHeight + 16}" rx="12" ry="12" fill="${lightgrey}aa"`),
      left: Math.floor(imageWidth / 2) + 8,
      top: move()
    })
    const dl = Math.floor((imageWidth / 2 - 80 * eicons.length - 8) / 2) + imageWidth / 2
    for (let i = 0; i < eicons.length; i++) {
      const icon = eicons[i]
      // console.log(key)
      // const icon = sharp(resolve(__dirname, `../assets/equipments/${key}.png`)).resize(72, 72)
      draw({
        input: await icon.toBuffer(),
        left: dl + i * 80,
        top: move() + 16
      })
    }
  }
  move(infoHeight + 30)
}

/** @type { DrawFunction } */
const drawFavors = async (s, draw, move, t) => {
  /** @type { Array<(h: number) => Promise<OverlayOptions>> } */
  const comps = []
  let maxh = 0
  const width = Math.floor((imageWidth - 48) / 2)
  const iconSize = 72
  // Favors
  const favors = getFavorsByTags([...s.FavorItemTags, ...s.FavorItemUniqueTags]).sort((a, b) => {
    const r = b.Rarity - a.Rarity
    if (r !== 0) return r
    return b.Id - a.Id
  })
  // console.log(favors.map(i => i.Name))
  // writeFileSync(resolve(__dirname, '../test/favor.json'), JSON.stringify(favors, null, 2))
  let favh = 0
  if (favors.length) {
    /** @type { import('../types/item').FavorItem[][] } */
    const favs = []
    for (const f of favors) {
      if (!favs.length) favs.push([f])
      else {
        const last = favs[favs.length - 1]
        if (last.length > 3) favs.push([f])
        else last.push(f)
      }
    }
    for (let n = 0; n < favs.length; n++) {
      const l = favs[n].length
      const pl = Math.floor((width - (iconSize + 8) * l + 8) / 2)
      for (let i = 0; i < l; i++) {
        const icon = resolve(__dirname, `../assets/items/${favs[n][i].Id}.png`)
        comps.push(async h => ({
          input: await sharp(icon).resize(iconSize, iconSize).png().toBuffer(),
          left: 16 + pl + i * (iconSize + 8),
          top: move() + n * (iconSize + 8) + 8 + Math.floor((h - (iconSize + 8) * favs.length - 8) / 2)
        }))
      }
      favh += iconSize + 12
    }
  } else {
    // no favors
    const text = textPng({
      text: t('no_favor_item'),
      fontSize: 24,
      color: black,
    })
    const meta = await text.metadata()
    comps.push(async h => ({
      input: await text.toBuffer(),
      left: 16 + Math.floor((width - meta.width) / 2),
      top: move() + Math.floor((h - meta.height) / 2)
    }))
    favh += meta.height + 32
  }
  // Furniture
  let furh = 0
  const furInt = s.FurnitureInteraction[0]?.[0] || []
  const furnitures = furInt.map(i => getFurnitureById(i)).filter(i => i && i.Tags.some(t => s.FavorItemUniqueTags.includes(t)))
  if (furnitures.length) {
    /** @type { import('../types/furniture').Furniture[][] } */
    const furs = []
    for (const f of furnitures) {
      if (!furs.length) furs.push([f])
      else {
        const last = furs[furs.length - 1]
        if (last.length > 3) furs.push([f])
        else last.push(f)
      }
    }
    for (let n = 0; n < furs.length; n++) {
      const l = furs[n].length
      const pl = Math.floor((width - (iconSize + 8) * l + 8) / 2)
      for (let i = 0; i < l; i++) {
        const icon = resolve(__dirname, `../assets/furnitures/${furs[n][i].Id}.png`)
        comps.push(async h => ({
          input: await sharp(icon).resize(iconSize, iconSize).png().toBuffer(),
          left: 40 + pl + i * (iconSize + 8) + width,
          top: move() + n * (iconSize + 8) + 8 + Math.floor((h - (iconSize + 8) * furs.length - 8) / 2)
        }))
      }
      furh += iconSize + 12
    }
  } else {
    // no furs
    const text = textPng({
      text: t('no_furniture'),
      fontSize: 24,
      color: black,
    })
    const meta = await text.metadata()
    comps.push(async h => ({
      input: await text.toBuffer(),
      left: width + 32 + Math.floor((width - meta.width) / 2),
      top: move() + Math.floor((h - meta.height) / 2)
    }))
    furh += meta.height + 32
  }

  maxh = Math.max(favh, furh)
  draw({
    input: rect(`width="${width}" height="${maxh}" rx="12" ry="12" fill="${lightgrey}aa"`),
    left: 16,
    top: move()
  }, {
    input: rect(`width="${width}" height="${maxh}" rx="12" ry="12" fill="${lightgrey}aa"`),
    left: 32 + width,
    top: move()
  })
  const toDraws = await Promise.all(comps.map(i => i(maxh)))
  draw(...toDraws)
  move(maxh + 12)
}

/** @type { DrawFunction } */
const drawAdapt = async (s, draw, move, t) => {
  const props = [
    { name: 'Street', key: 'StreetBattleAdaptation' },
    { name: 'Outdoor', key: 'OutdoorBattleAdaptation' },
    { name: 'Indoor', key: 'IndoorBattleAdaptation' },
  ]
  let left = 16
  const size = 48
  for (const { name, key } of props) {
    const icon = sharp(resolve(__dirname, `../assets/ui/${name}.png`)).resize(size, size)
    const adaptIcon = sharp(resolve(__dirname, `../assets/ui/Adapt_${s[key]}.png`)).resize(size - 8, size - 8)
    draw({
      input: rect(`width="${size + 16}" height="${size * 2 + 24}" rx="4" ry="4" fill="${lightgrey}aa"`),
      left,
      top: move()
    }, {
      input: await icon.toBuffer(),
      left: left + 8,
      top: move() + 8
    }, {
      input: await adaptIcon.toBuffer(),
      left: left + 12,
      top: move() + size + 20
    })
    left += size + 20
  }
}

/** @type { DrawFunction } */
const drawStats = async (s, draw, move, t) => {
  const baseStat = new CharacterStats(s, 90, s.StarGrade)
  const stats = new CharacterStats(s, 90, 5)
  for (const cate of s.Equipment) {
    const eq = getEquipment(cate)
    if (eq) {
      for (let i = 0; i < eq.StatType.length; i++) {
        stats.addBuff(eq.StatType[i], eq.StatValue[i][1])
      }
    }
  }
  const bound = getBoundStats(s, 50)
  for (const key in bound) {
    stats.addBuff(key, bound[key])
  }
  for (const alt of s.FavorAlts) {
    const bound = getBoundStats(getStudentById(alt), 50)
    for (const key in bound) {
      stats.addBuff(key, bound[key])
    }
  }
  const defaultLeft = 56
  const right = Math.floor(imageWidth / 2) + 48
  let left = defaultLeft
  const statSize = 22
  for (const key of studentStatList) {
    const name = t('Stat', key)
    const base = baseStat.getTotalString(key)
    const max = stats.getTotalString(key)
    const iconPath = resolve(__dirname, `../assets/stats/${key}.png`)
    if (existsSync(iconPath)) {
      const template = sharp(await sharp(iconPath).resize(24).png().toBuffer())
      const dh = 24 - (await template.metadata()).height
      const icon = sharp({
        create: { width: 24, height: (await template.metadata()).height, channels: 4, background: '#000' }
      }).composite([{
        input: await template.toBuffer(),
        blend: 'dest-in'
      }]).png()
      draw({
        input: await icon.toBuffer(),
        left: left - 32,
        top: move() + dh,
      })
    }
    const value = textPng({
      text: `${base} / ${max}`,
      fontSize: statSize,
      color: blue
    })
    // console.log(key, (await value.metadata()).width)
    draw({
      input: rect(`width="${Math.floor(imageWidth / 2) - 24}" height="${statSize + 8}" rx="4" ry="4" fill="${lightgrey}a0"`),
      left: left - 40,
      top: move() - 4
    }, {
      input: await textPng({ text: name, fontSize: statSize, color: '#555' }).toBuffer(),
      left,
      top: move()
    }, {
      input: await value.toBuffer(),
      left: left + Math.floor(275 - (await value.metadata()).width),
      top: move()
    })
    if (left === defaultLeft) left = right
    else {
      move(statSize + 12)
      left = defaultLeft
    }
  }
  if (left !== defaultLeft) move(32)
}

/** @type { DrawFunction } */
const drawSkills = async (s, draw, move, t, lang = 'cn') => {
  const cwidth = imageWidth - 32
  const descPng = desc => sharp({
    text: {
      text: `<span color="${black}" size="20pt">${desc}</span>`,
      font: defaultFont,
      fontfile: defaultFontfile,
      dpi: 72,
      width: cwidth - 112,
      rgba: true,
      align: 'left',
      wrap: 'char',
    }
  }).png()
  const drawOne = async (sk) => {
    const stype = sk.SkillType === 'normal'
      ? t('skill_normal')
      : sk.SkillType === 'passive'
        ? t('skill_passive')
        : sk.SkillType === 'ex'
          ? t('skill_ex')
          : t('skill_sub')
    const icon = sharp(resolve(__dirname, `../assets/skills/${sk.Icon}.png`)).resize(64, 64).png()
    const contIcon = sharp({
      create: {
        width: 72,
        height: 72,
        channels: 4,
        background: getBulletTypeBg(s.BulletType)
      }
    }).composite([{
      input: rect('width="72" height="72" rx="36" ry="36"'),
      blend: 'dest-in'
    }, {
      input: await icon.toBuffer(),
      left: 4,
      top: 4
    }]).png()
    const title = textPng({ text: sk.Name, fontSize: 28, color: black })
    const sub = textPng({ text: stype, fontSize: 20, color: black })
    const dtext = parseRichText({ text: sk.Desc, params: sk.Parameters, level: sk.Parameters[0]?.length, lang })
    const desc = descPng(dtext)
    const tmeta = await title.metadata()
    const dmeta = await desc.metadata()
    const height = Math.max(tmeta.height + dmeta.height, 56) + 32
    draw({
      input: rect(`width="${cwidth}" height="${height}" rx="12" ry="12" fill="${lightgrey}aa"`),
      left: 16,
      top: move()
    }, {
      input: await contIcon.toBuffer(),
      left: 24,
      top: move() + 8
    }, {
      input: await title.toBuffer(),
      left: 108,
      top: move() + 8,
    }, {
      input: await sub.toBuffer(),
      left: 112 + tmeta.width,
      top: move() + 18
    }, {
      input: await desc.toBuffer(),
      left: 112,
      top: move() + tmeta.height + 16,
    })
    move(height + 4)
  }
  const drawMats = async (ids, nums, max = 8) => {
    const cwidth = Math.floor((imageWidth - 48) / 2)
    const lineNum = Math.ceil(Math.min(max, ids.length) / 2)
    const size = 48
    const cicon = sharp(resolve(__dirname, '../assets/others/Credits.png')).resize(size, size)
    for (let line = 0; line < lineNum; line++) {
      const l = line, r = line + lineNum
      for (let s = 0; s < 2; s++) {
        const c = s ? r : l
        const pl = s ? cwidth + 16 : 0
        draw({
          input: rect(`width="${cwidth}" height="${size + 24}" rx="4" ry="4" fill="${lightgrey}a0"`),
          left: 16 + pl,
          top: move()
        }, {
          input: await textPng({ text: `${c + 1}→${c + 2}`, fontSize: 18 }).toBuffer(),
          left: 30 + pl,
          top: move() + 28
        })
        for (let i = 0; i < ids[c].length; i++) {
          const dl = 48 + i * size + Math.floor((cwidth - size * ids[c].length - 72) / 2)
          const id = ids[c][i], count = nums[c][i]
          const icon = sharp(resolve(__dirname, `../assets/items/${id}.png`)).resize(size, size).png()
          const countPng = textPng({ text: 'x' + count, color: black, fontSize: 16 })
          draw({
            input: await icon.toBuffer(),
            left: dl + pl,
            top: move() + 4
          }, {
            input: await countPng.toBuffer(),
            left: dl + Math.floor((size - (await countPng.metadata()).width) / 2) + pl,
            top: move() + size + 6
          })
        }
        const dl = 48 + Math.min(max, ids[c].length) * size + Math.floor((cwidth - size * ids[c].length - 72) / 2)
        const cred = textPng({
          text: 'x' + numberToLarger(max === 8 ? skillCredits[c] : skillExCredits[c]),
          color: black,
          fontSize: 16
        })
        draw({
          input: await cicon.toBuffer(),
          left: dl + pl,
          top: move() + 4,
        }, {
          input: await cred.toBuffer(),
          left: dl + pl + Math.floor((size - (await cred.metadata()).width) / 2),
          top: move() + size + 6
        })
      }
      move(size + 28)
    }
  }
  // Ex
  const ex = s.Skills.find(s => s.SkillType === 'ex')
  if (ex) {
    await drawOne(ex)
    await drawMats(s.SkillExMaterial, s.SkillExMaterialAmount, 4)
    move(8)
  }
  const normals = s.Skills.filter(s => ['normal', 'passive', 'sub'].includes(s.SkillType))
  for (const sk of normals) {
    await drawOne(sk)
  }
  await drawMats(s.SkillMaterial, s.SkillMaterialAmount, 8)
  move(8)
}

/**
 * @param { Student } student
 * @param { 'cn'|'jp'|'en'|'tw'|'kr'|'th'|'vi' } lang
 * @param { string } [watermark]
 */
const studentCard = async (student, lang = 'cn', watermark = '', dev = false) => {
  const translate = (key, value) => {
    if (!value) return localize('i18n', key, lang)
    return localize(key, value, lang)
  }
  /** @type { OverlayOptions[] } */
  const comps = [{
    input: await logo.toBuffer(),
    tile: true,
    gravity: 'northeast'
  }]
  let imageHeight = 16
  /** @param { OverlayOptions[] } args */
  const draw = (...args) => comps.push(...args)
  const move = (h = 0) => {
    imageHeight += h
    return imageHeight
  }
  const jpVer = getStudentById(student.Id, 'jp') || student

  // Title
  const name = `${student.FamilyName} ${student.PersonalName}`
  if (jpVer.FamilyNameRuby) {
    const ruby = textPng({
      text: jpVer.FamilyNameRuby + ' ' + jpVer.PersonalName,
      fontSize: 16,
      color: grey,
      font: miSans,
      fontfile: miSansFile,
    })
    draw({
      input: await ruby.toBuffer(),
      left: 16,
      top: imageHeight
    })
    move((await ruby.metadata()).height + 4)
  }
  const title = textPng({
    text: name,
    fontSize: 44,
    maxWidth: imageWidth - 144,
    font: miSans,
    fontfile: miSansFile,
  })
  draw({
    input: await title.toBuffer(),
    left: 16,
    top: imageHeight,
  })
  const club = translate('Club', student.Club)
  draw({
    input: await textPng({ text: club, fontSize: 22, color: blue }).toBuffer(),
    left: 32 + (await title.metadata()).width,
    top: imageHeight + 20
  })
  move((await title.metadata()).height + 12)

  await drawBaseInfo(student, draw, move, translate)
  await drawEquipInfo(student, draw, move, translate)
  await drawFavors(student, draw, move, translate)

  // Portrait
  const portPath = resolve(__dirname, `../assets/portraits/${student.DevName}.webp`)
  if (existsSync(portPath) && !dev) {
    let portrait = sharp(portPath).png()
    let meta = await portrait.metadata()
    if (meta.width > imageWidth) {
      portrait = sharp(await portrait.resize(720).toBuffer()).png()
      meta = await portrait.metadata()
    }
    draw({
      input: await portrait.toBuffer(),
      left: pl(meta.width),
      top: move()
    })
    await drawAdapt(student, draw, move, translate)
    move(meta.height + 12)
  } else {
    // 如果因为各种原因立绘没了...
    await drawAdapt(student, draw, move, translate)
    move(128)
  }

  // Stats
  await drawStats(student, draw, move, translate)
  await drawSkills(student, draw, move, translate, lang)

  if (watermark && watermark.length) {
    const wm = textPng({
      text: watermark,
      color: grey,
      fontSize: 18,
      font: miSans,
      fontfile: miSansFile
    })
    draw({
      input: await wm.toBuffer(),
      left: pl((await wm.metadata()).width),
      top: move()
    })
    move((await wm.metadata()).height + 12)
  }

  if (imageHeight < 480) imageHeight = 480
  const img = sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: dev ? '#1e1e1e' : white
    }
  }).composite(comps)
  return img.png()
}
module.exports = studentCard
