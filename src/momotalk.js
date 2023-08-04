const { resolve } = require('path')
const sharp = require('sharp')
const escapeHtml = require('../utils/escapeHtml')

const globalConfig = {
  title: 'MomoTalk',
  kizunaTitle: '好感故事',
  optionTitle: '回复'
}
/**
 * @param { { title?: string, kizunaTitle?: string, optionTitle?: string } } conf
 */
const setConfig = conf => {
  for (const key in conf) {
    if (!(key in globalConfig)) {
      console.warn(`Unknown key ${key} for momotalk config`)
      continue
    }
    const val = conf[key].trim()
    if (!val) console.warn(`Invalid value for momotalk config key ${key}: ${conf[key]}`)
    else globalConfig[key] = val
  }
}

/**
 * @typedef { import('./getStudent').Student } Student
 * @typedef Message
 * @prop { 'student'|'teacher'|'option'|'kizuna' } type
 * @prop { Student } [student]
 * @prop { string|string[] } content
 */
const imageWidth = 720
const miSansFile = resolve(__dirname, '../assets/fonts/MiSans-Bold.ttf')
const miSans = 'MiSans Bold'
const defaultFontfile = resolve(__dirname, '../assets/fonts/Yuanti SC.ttc')
const defaultFont = 'Yuanti SC Bold'

const black = '#2a323e'
const white = '#ecf2fb'
const fontGrey = '#87929e'
const chatBorderColor = '#cdd3dc'
const roundSvg = ({ width = imageWidth, height = 32, rx = 16, ry = 16 }) => {
  return Buffer.from(`<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${ry}" paint-order="stroke"/></svg>`)
}
const momoSvg = Buffer.from(`<svg x="0" y="0" viewBox="0 0 512 477.9" fill="#fff" >
  <path d="M101.8 396.4c-53.3 0-98.4 53.8-101.8 79.5 81.4 7.9 196.1-6.8 252.1-65-74.7 13.5-135.9-5.2-150.3-14.5zM281.4 412.5c55.1 73.3 137.7 58.5 230.5 63.3 3.5-42.1-73.2-80.9-103.9-82.2-39.9 28.5-123.3 19.5-126.6 18.9z"></path>
  <path d="M256.4 0C136.8 45 31.5 151.4 31.5 259.4c0 85 68.4 153.9 195.3 137.3 3.9-.5 7.6-1.1 11.2-1.7-1.1-.4-2.1-.9-2.9-1.3-19.4-9.8-53.4-56.7-39-112.6 1.4 59.3 39.7 102.6 57.1 111 2.7 1.3 11.9 4.6 25.5 6.7 51.9 8 164.9 4.7 187.9-116.7C498.9 111.4 256.4 0 256.4 0z"></path>
</svg>`)

const textPng = ({
  text = '',
  fontSize = 32,
  color = '#000',
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
 * @param { { student: Student, content: string } } talk
 * @param { (...args: import('sharp').OverlayOptions[] ) => number } draw
 * @param { (h?: number) => number } move
 * @param { Array<Buffer|string> } [images]
 */
const drawStudent = async (talk, draw, move, images = []) => {
  const lines = talk.content.split('\n').map(i => i.trim()).filter(i => i)
  const s = talk.student
  const name = s.Name
  const icon = s.Icon ? s.Icon : resolve(__dirname, `../assets/icons/${s.CollectionTexture}.png`)
  const ch = move()
  const circIcon = sharp(icon).resize(64, 64).png().composite([{
    input: roundSvg({ width: 64, height: 64, rx: 32, ry: 32 }),
    blend: 'dest-in'
  }])
  draw({
    input: await circIcon.toBuffer(),
    left: 12,
    top: ch
  })
  let th = -8
  for (const line of lines) {
    const isFirst = th === -8
    const texts = line.split(/\[img\:(\d+)\]/g)
    if (isFirst) {
      const sname = textPng({ text: name, color: '#4b5a6f', fontSize: 24 })
      draw({
        input: await sname.toBuffer(),
        left: 96,
        top: move() + 4 + th
      })
      th += (await sname.metadata()).height + 12
      if (texts[0]?.trim()) {
        draw({
          input: Buffer.from(`<svg height="10" width="12">
            <polygon points="0,5 12,0 12,10" style="fill:#4b5a6f" />
          </svg>`),
          left: 84,
          top: move() + 12 + th
        })
      }
    }
    let isImage = false
    for (const line of texts) {
      if (isImage) {
        isImage = false
        const content = images[Number(line) - 1]
        if (!content) continue
        const img = sharp(await sharp(content).resize(300).toBuffer())
        const meta = await img.metadata()
        // console.log(meta.width, meta.height)
        const buf = await img.composite([{
          input: roundSvg({ width: meta.width, height: meta.height, rx: 12, ry: 12 }),
          blend: 'dest-in'
        }, {
          input: await sharp(Buffer.from(`<svg><rect x="0" y="0" width="${meta.width}" height="${meta.height}" rx="12" ry="12" stroke="${chatBorderColor}" stroke-width="2" fill="#0000"/></svg>`)).resize(meta.width, meta.height).png().toBuffer(),
          left: 0,
          top: 0
        }]).png().toBuffer()
        draw({
          input: buf,
          left: 96,
          top: move() + th
        })
        th += meta.height + 8
        continue
      }
      isImage = true
      if (!line.trim().length) continue
      const text = textPng({ text: line.trim(), maxWidth: imageWidth - 140, color: '#ecf2fb' })
      const tmeta = await text.metadata()
      const bg = roundSvg({
        width: tmeta.width + 32,
        height: tmeta.height + 32,
        rx: 12,
        ry: 12
      })
      draw({
        input: await sharp({
          create: {
            width: tmeta.width + 32,
            height: tmeta.height + 32,
            channels: 4,
            background: '#4b5a6f'
          }
        }).composite([{
          input: bg,
          blend: 'dest-in'
        }]).png().toBuffer(),
        left: 96,
        top: move() + th
      }, {
        input: await text.toBuffer(),
        left: 112,
        top: move() + 16 + th
      })
      th += tmeta.height + 40
    }
  }
  th += 8
  move(th > 72 ? th : 72)
}
/**
 * @param { { content: string } } talk
 * @param { (...args: OverlayOptions[] ) => number } draw
 * @param { (h?: number) => number } move
 * @param { Array<Buffer|string> } [images]
 */
const drawTeacher = async (talk, draw, move, images = []) => {
  const lines = talk.content.split('\n').map(i => i.trim()).filter(i => i)
  let th = 0
  for (const line of lines) {
    const isFirst = th === 0
    const texts = line.split(/\[img\:(\d+)\]/g)
    if (isFirst && texts[0]?.trim()) {
      draw({
        input: Buffer.from(`<svg height="10" width="12">
          <polygon points="0,0 0,10 12,5" style="fill:#4a8ac6" />
        </svg>`),
        left: imageWidth - 20,
        top: move() + 14 + th
      })
    }
    let isImage = false
    for (const line of texts) {
      if (isImage) {
        isImage = false
        const content = images[Number(line) - 1]
        if (!content) continue
        const img = sharp(await sharp(content).resize(300).toBuffer())
        const meta = await img.metadata()
        // console.log(meta.width, meta.height)
        const buf = await img.composite([{
          input: roundSvg({ width: meta.width, height: meta.height, rx: 12, ry: 12 }),
          blend: 'dest-in'
        }, {
          input: await sharp(Buffer.from(`<svg><rect x="0" y="0" width="${meta.width}" height="${meta.height}" rx="12" ry="12" stroke="${chatBorderColor}" stroke-width="2" fill="#0000"/></svg>`)).resize(meta.width, meta.height).png().toBuffer(),
          left: 0,
          top: 0
        }]).png().toBuffer()
        draw({
          input: buf,
          left: imageWidth - meta.width - 20,
          top: move() + th
        })
        th += meta.height + 8
        continue
      }
      isImage = true
      if (!line.trim().length) continue
      const text = textPng({ text: line.trim(), maxWidth: imageWidth - 140, color: '#ecf2fb' })
      const tmeta = await text.metadata()
      const bg = roundSvg({
        width: tmeta.width + 32,
        height: tmeta.height + 32,
        rx: 12,
        ry: 12
      })
      draw({
        input: await sharp({
          create: {
            width: tmeta.width + 32,
            height: tmeta.height + 32,
            channels: 4,
            background: '#4a8ac6'
          }
        }).composite([{
          input: bg,
          blend: 'dest-in'
        }]).png().toBuffer(),
        left: imageWidth - tmeta.width - 52,
        top: move() + th
      }, {
        input: await text.toBuffer(),
        left: imageWidth - tmeta.width - 36,
        top: move() + 16 + th
      })
      th += tmeta.height + 40
    }
  }
  th += 8
  move(th > 72 ? th : 72)
}
/**
 * @param { { content: string[]|string } } talk
 * @param { (...args: OverlayOptions[] ) => number } draw
 * @param { (h?: number) => number } move
 * @param { Array<Buffer|string> } [images]
 */
const drawOptions = async (talk, draw, move, images = []) => {
  const content = typeof talk.content === 'string' ? talk.content.trim().split('\n') : talk.content
  const bgColor = '#e2eef3'
  const optionBgColor = '#fefefe'
  const leftColor = '#3198de'
  const textColor = '#4b5a6f'
  // background: #ffedf1
  const width = imageWidth - 116
  let height = 0
  const title = textPng({
    text: globalConfig.optionTitle,
    color: textColor,
    maxWidth: width - 20
  })
  const leftLine = Buffer.from(`<svg><rect x="0" y="0" width="4" height="30" fill="${leftColor}"/></svg>`)
  const titleMeta = await title.metadata()
  height = titleMeta.height + 12
  const splitLine = Buffer.from(`<svg><rect x="0" y="0" width="${width - 40}" height="2" fill="${chatBorderColor}"/></svg>`)
  height += 14
  const options = (await Promise.all(content.map(async text => {
    if (!text.trim()) return null
    const img = textPng({
      text,
      color: textColor,
      maxWidth: width - 40,
      align: 'center'
    })
    const meta = await img.metadata()
    const bg = Buffer.from(`<svg><rect
      x="0" y="0"
      width="${width - 32}" height="${meta.height + 24}"
      fill="${optionBgColor}"
      stroke="${chatBorderColor}" stroke-width="2"
      rx="12" ry="12"
    /></svg>`)
    return {
      width: meta.width,
      height: meta.height + 24,
      img, bg
    }
  }))).filter(i => i)
  height += options.reduce((p, c) => p + c.height + 12, 0)
  const left = imageWidth - width - 20
  draw({
    input: Buffer.from(`<svg><rect
      x="0" y="0"
      width="${width}" height="${height + 12}"
      fill="${bgColor}"
      stroke="${chatBorderColor}" stroke-width="2"
      rx="12" ry="12"
    /></svg>`),
    left,
    top: move()
  }, {
    input: leftLine,
    left: left + 16,
    top: move() + 12
  }, {
    input: await title.toBuffer(),
    left: left + 28,
    top: move() + 10
  }, {
    input: splitLine,
    left: left + 18,
    top: move() + 12 + titleMeta.height + 8,
  })
  let dh = move() + 12 + titleMeta.height + 20
  for (const opt of options) {
    draw({
      input: opt.bg,
      left: left + 18,
      top: dh,
    }, {
      input: await opt.img.toBuffer(),
      left: left + Math.floor((width - opt.width) / 2),
      top: dh + 12
    })
    dh += opt.height + 12
  }
  move(height + 24)
}
/**
 * @param { { student: Student, content: string } } talk
 * @param { (...args: OverlayOptions[] ) => number } draw
 * @param { (h?: number) => number } move
 */
const drawKizuna = async (talk, draw, move) => {
  const name = talk.student.Name
  const content = talk.content.trim() || `进入${name}的好感故事`
  // background: #ffedf1
  const width = imageWidth - 116
  let height = 0
  const title = textPng({
    text: globalConfig.kizunaTitle,
    color: '#4b5a6f',
    maxWidth: width - 20
  })
  const leftLine = Buffer.from(`<svg><rect x="0" y="0" width="4" height="30" fill="#ff8ba0"/></svg>`)
  const titleMeta = await title.metadata()
  height = titleMeta.height + 12
  const splitLine = Buffer.from(`<svg><rect x="0" y="0" width="${width - 40}" height="2" fill="${chatBorderColor}"/></svg>`)
  height += 14
  // console.log(content)
  const main = textPng({
    text: content,
    color: '#ffedf1',
    maxWidth: width - 40,
    align: 'center'
  })
  const meta = await main.metadata()
  const mainBg = Buffer.from(`<svg>
    <rect x="0" y="0"
      width="${width - 32}" height="${meta.height + 24}"
      stroke="${chatBorderColor}" stroke-width="2"
      fill="#ff8ba0"
    rx="12" ry="12"/>
  </svg>`)
  height += meta.height + 44
  // console.log(width, height, chatBorderColor)
  const bg = Buffer.from(`<svg>
    <rect x="0" y="0" width="${width}" height="${height}" stroke="${chatBorderColor}" stroke-width="2" fill="#ffecf2" rx="12" ry="12"/>
  </svg>`)
  const left = 96
  draw({
    input: bg,
    left,
    top: move()
  }, {
    input: leftLine,
    left: left + 16,
    top: move() + 12
  }, {
    input: await title.toBuffer(),
    left: left + 28,
    top: move() + 10
  }, {
    input: splitLine,
    left: left + 18,
    top: move() + 12 + titleMeta.height + 8,
  }, {
    input: mainBg,
    left: left + 18,
    top: move() + 16 + titleMeta.height + 18
  }, {
    input: await main.toBuffer(),
    left: left + Math.floor((width - meta.width) / 2),
    top: move() + 16 + titleMeta.height + 30
  })
  move(height + 12)
}
/**
 * @function momotalk
 * @param { Message[] } talks
 * @param { (Buffer|string)[] } images
 */
const momotalk = async (talks, images = [], watermark = '') => {
  /** @type { import('sharp').OverlayOptions[] } */
  const comps = []
  let imageHeight = 8
  /** @param { import('sharp').OverlayOptions[] } args */
  const draw = (...args) => comps.push(...args)
  const move = (h = 0) => {
    imageHeight += h
    return imageHeight
  }

  // Title
  const titleBg = await sharp({
    create: {
      width: imageWidth - 12,
      height: 64,
      channels: 4,
      background: '#fa97ab'
    }
  }).composite([{
    input: roundSvg({ width: imageWidth - 12, height: 64, rx: 18, ry: 18 }),
    blend: 'dest-in'
  }]).png().toBuffer()
  draw({
    input: titleBg,
    left: 6,
    top: move()
  }, {
    input: await sharp(momoSvg).resize(36, 36).png().toBuffer(),
    left: 24,
    top: move() + 12,
  }, {
    input: await textPng({
      text: globalConfig.title,
      fontSize: 36,
      color: 'white',
      font: miSans,
      fontfile: miSansFile
    }).toBuffer(),
    left: 72,
    top: move() + 16
  }, {
    input: await textPng({
      text: 'X',
      fontSize: 40,
      color: 'white',
    }).toBuffer(),
    left: imageWidth - 52,
    top: move() + 16
  })
  move(84)

  for (const m of talks) {
    switch (m.type) {
      case 'student':
        await drawStudent(m, draw, move, images)
        break
      case 'teacher':
        await drawTeacher(m, draw, move, images)
        break
      case 'option':
        await drawOptions(m, draw, move, images)
        break
      case 'kizuna':
        await drawKizuna(m, draw, move, images)
        break
    }
    move(12)
  }

  if (watermark.trim().length) {
    const wm = textPng({
      text: watermark.trim(),
      fontSize: 20,
      maxWidth: imageWidth - 48,
      color: fontGrey,
      font: miSans,
      fontfile: miSansFile
    })
    const meta = await wm.metadata()
    draw({
      input: await wm.toBuffer(),
      left: Math.floor((imageWidth - meta.width) / 2),
      top: move()
    })
    move(meta.height + 12)
  }

  // imageHeight += 12
  // console.log(imageWidth, imageHeight)
  return sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: white
      // background: '#1e1e1e'
    }
  }).composite(comps).png()
}
module.exports = {
  momotalk,
  setConfig
}
