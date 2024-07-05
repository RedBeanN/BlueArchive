const { resolve } = require('path')
const sharp = require('sharp')
const escapeHtml = require('../utils/escapeHtml')

const momoConfig = {
  title: 'MomoTalk',
  titleBackground: '#fa97ab',
  titleIcon: '',
  kizunaTitle: '好感故事',
  optionTitle: '回复',
}
/**
 * @param { {
 *  title?: string,
 *  titleBackground?: string,
 *  titleIcon?: string|Buffer|import('stream').Duplex,
 *  kizunaTitle?: string,
 *  optionTitle?: string,
 * } } conf
 */
const setConfig = conf => {
  for (const key in conf) {
    if (!(key in momoConfig)) {
      console.warn(`Unknown key ${key} for momotalk config`)
      continue
    }
    const val = conf[key].trim()
    if (!val) console.warn(`Invalid value for momotalk config key ${key}: ${conf[key]}`)
    else momoConfig[key] = val
  }
}

/**
 * @typedef { import('./getStudent').Student } Student
 * @typedef Message
 * @prop { 'student'|'teacher'|'option'|'kizuna' } type
 * @prop { Student } [student]
 * @prop { string|string[] } content
 */
const imageWidth = 1080
const fz = (n = 1) => imageWidth / 90 * n
const miSansFile = resolve(__dirname, '../assets/fonts/MiSans-Bold.ttf')
const miSans = 'MiSans Bold'
// const defaultFontfile = resolve(__dirname, '../assets/fonts/Yuanti SC.ttc')
// const defaultFont = 'Yuanti SC Bold'
const defaultFontfile = resolve(__dirname, '../assets/fonts/ResourceHanRoundedCN.ttf')
const defaultFont = 'Resource Han Rounded CN Medium'

const black = '#2a323e'
const white = '#ecf2fb'
const fontGrey = '#87929e'
const chatBorderColor = '#cdd3dc'
const roundSvg = ({ width = imageWidth, height = fz(4), rx = fz(2), ry = fz(2) }) => {
  return Buffer.from(`<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${rx}" ry="${ry}" paint-order="stroke"/></svg>`)
}
const momoSvg = Buffer.from(`<svg x="0" y="0" viewBox="0 0 512 477.9" fill="#fff" >
  <path d="M101.8 396.4c-53.3 0-98.4 53.8-101.8 79.5 81.4 7.9 196.1-6.8 252.1-65-74.7 13.5-135.9-5.2-150.3-14.5zM281.4 412.5c55.1 73.3 137.7 58.5 230.5 63.3 3.5-42.1-73.2-80.9-103.9-82.2-39.9 28.5-123.3 19.5-126.6 18.9z"></path>
  <path d="M256.4 0C136.8 45 31.5 151.4 31.5 259.4c0 85 68.4 153.9 195.3 137.3 3.9-.5 7.6-1.1 11.2-1.7-1.1-.4-2.1-.9-2.9-1.3-19.4-9.8-53.4-56.7-39-112.6 1.4 59.3 39.7 102.6 57.1 111 2.7 1.3 11.9 4.6 25.5 6.7 51.9 8 164.9 4.7 187.9-116.7C498.9 111.4 256.4 0 256.4 0z"></path>
</svg>`)

const textPng = ({
  text = '',
  fontSize = fz(4),
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
  const name = s.DisplayName || s.Name
  const icon = s.Icon ? s.Icon : resolve(__dirname, `../assets/icons/${s.CollectionTexture}.png`)
  const ch = move()
  const circIcon = sharp(icon).resize(fz(8), fz(8)).png().composite([{
    input: roundSvg({ width: fz(8), height: fz(8), rx: fz(4), ry: fz(4) }),
    blend: 'dest-in'
  }])
  draw({
    input: Buffer.from(`<svg><rect x="0" y="0" width="${fz(8)}" height="${fz(8)}" rx="${fz(4)}" ry="${fz(4)}" fill="white"/></svg>`),
    left: fz(1.5),
    top: ch
  }, {
    input: await circIcon.toBuffer(),
    left: fz(1.5),
    top: ch
  })
  let th = -fz(1)
  for (const line of lines) {
    const isFirst = th === -fz(1)
    const texts = line.split(/\[img\:(\d+)\]/g)
    if (isFirst) {
      const sname = textPng({ text: name, color: '#4b5a6f', fontSize: fz(3) })
      draw({
        input: await sname.toBuffer(),
        left: fz(12),
        top: move() + fz(0.5) + th
      })
      th += (await sname.metadata()).height + fz(1.5)
      if (texts[0]?.trim()) {
        draw({
          input: Buffer.from(`<svg height="${fz(1.5)}" width="${fz(1.5)}">
            <polygon points="0,${fz(0.75)} ${fz(1.5)},0 ${fz(1.5)},${fz(1.5)}" style="fill:#4b5a6f" />
          </svg>`),
          left: fz(10.5),
          top: move() + fz(1.5) + th
        })
      }
    }
    let isImage = false
    for (const line of texts) {
      if (isImage) {
        isImage = false
        const content = images[Number(line) - 1]
        if (!content) continue
        const img = sharp(await sharp(content).resize(fz(37.5)).toBuffer())
        const meta = await img.metadata()
        // console.log(meta.width, meta.height)
        const buf = await img.composite([{
          input: roundSvg({ width: meta.width, height: meta.height, rx: fz(1.5), ry: fz(1.5) }),
          blend: 'dest-in'
        }, {
          input: await sharp(Buffer.from(`<svg><rect x="0" y="0" width="${meta.width}" height="${meta.height}" rx="${fz(1.5)}" ry="${fz(1.5)}" stroke="${chatBorderColor}" stroke-width="2" fill="#0000"/></svg>`)).resize(meta.width, meta.height).png().toBuffer(),
          left: 0,
          top: 0
        }]).png().toBuffer()
        draw({
          input: buf,
          left: fz(12),
          top: move() + th
        })
        th += meta.height + fz(1)
        continue
      }
      isImage = true
      if (!line.trim().length) continue
      const text = textPng({ text: line.trim(), maxWidth: imageWidth - fz(17.5), color: '#ecf2fb' })
      const tmeta = await text.metadata()
      const bg = roundSvg({
        width: tmeta.width + fz(4),
        height: tmeta.height + fz(4),
        rx: fz(1.5),
        ry: fz(1.5)
      })
      draw({
        input: await sharp({
          create: {
            width: tmeta.width + fz(4),
            height: tmeta.height + fz(4),
            channels: 4,
            background: '#4b5a6f'
          }
        }).composite([{
          input: bg,
          blend: 'dest-in'
        }]).png().toBuffer(),
        left: fz(12),
        top: move() + th
      }, {
        input: await text.toBuffer(),
        left: fz(14),
        top: move() + fz(2) + th
      })
      th += tmeta.height + fz(5)
    }
  }
  th += fz(1)
  move(th > fz(9) ? th : fz(9))
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
        input: Buffer.from(`<svg height="${fz(1.5)}" width="${fz(1.5)}">
          <polygon points="0,0 0,${fz(1.5)} ${fz(1.5)},${fz(0.75)}" style="fill:#4a8ac6" />
        </svg>`),
        left: imageWidth - fz(3),
        top: move() + fz(2) + th
      })
    }
    let isImage = false
    for (const line of texts) {
      if (isImage) {
        isImage = false
        const content = images[Number(line) - 1]
        if (!content) continue
        const img = sharp(await sharp(content).resize(fz(37.5)).toBuffer())
        const meta = await img.metadata()
        // console.log(meta.width, meta.height)
        const buf = await img.composite([{
          input: roundSvg({ width: meta.width, height: meta.height, rx: fz(1.5), ry: fz(1.5) }),
          blend: 'dest-in'
        }, {
          input: await sharp(Buffer.from(`<svg><rect x="0" y="0" width="${meta.width}" height="${meta.height}" rx="${fz(1.5)}" ry="${fz(1.5)}" stroke="${chatBorderColor}" stroke-width="2" fill="#0000"/></svg>`)).resize(meta.width, meta.height).png().toBuffer(),
          left: 0,
          top: 0
        }]).png().toBuffer()
        draw({
          input: buf,
          left: imageWidth - meta.width - fz(3),
          top: move() + th
        })
        th += meta.height + fz(1)
        continue
      }
      isImage = true
      if (!line.trim().length) continue
      const text = textPng({ text: line.trim(), maxWidth: imageWidth - fz(17.5), color: '#ecf2fb' })
      const tmeta = await text.metadata()
      const bg = roundSvg({
        width: tmeta.width + fz(4),
        height: tmeta.height + fz(4),
        rx: fz(1.5),
        ry: fz(1.5)
      })
      draw({
        input: await sharp({
          create: {
            width: tmeta.width + fz(4),
            height: tmeta.height + fz(4),
            channels: 4,
            background: '#4a8ac6'
          }
        }).composite([{
          input: bg,
          blend: 'dest-in'
        }]).png().toBuffer(),
        left: imageWidth - tmeta.width - fz(7),
        top: move() + th
      }, {
        input: await text.toBuffer(),
        left: imageWidth - tmeta.width - fz(5),
        top: move() + fz(2) + th
      })
      th += tmeta.height + fz(5)
    }
  }
  th += fz(1)
  move(th > fz(9) ? th : fz(9))
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
  const width = imageWidth - fz(16)
  let height = 0
  const title = textPng({
    text: momoConfig.optionTitle,
    color: textColor,
    maxWidth: width - fz(2.5)
  })
  const leftLine = Buffer.from(`<svg><rect x="0" y="0" width="${fz(0.5)}" height="${fz(3.75)}" fill="${leftColor}"/></svg>`)
  const titleMeta = await title.metadata()
  height = titleMeta.height + fz(1.5)
  const splitLine = Buffer.from(`<svg><rect x="0" y="0" width="${width - fz(5)}" height="3" fill="${chatBorderColor}"/></svg>`)
  height += fz(1.75)
  const options = (await Promise.all(content.map(async text => {
    if (!text.trim()) return null
    const img = textPng({
      text,
      color: textColor,
      maxWidth: width - fz(5),
      align: 'center'
    })
    const meta = await img.metadata()
    const bg = Buffer.from(`<svg><rect
      x="0" y="0"
      width="${width - fz(4)}" height="${meta.height + fz(3)}"
      fill="${optionBgColor}"
      stroke="${chatBorderColor}" stroke-width="2"
      rx="${fz(1.5)}" ry="${fz(1.5)}"
    /></svg>`)
    return {
      width: meta.width,
      height: meta.height + fz(3),
      img, bg
    }
  }))).filter(i => i)
  height += options.reduce((p, c) => p + c.height + fz(1.5), 0)
  const left = imageWidth - width - fz(3)
  draw({
    input: Buffer.from(`<svg><rect
      x="0" y="0"
      width="${width}" height="${height + fz(1.5)}"
      fill="${bgColor}"
      stroke="${chatBorderColor}" stroke-width="2"
      rx="${fz(1.5)}" ry="${fz(1.5)}"
    /></svg>`),
    left,
    top: move()
  }, {
    input: leftLine,
    left: left + fz(2),
    top: move() + fz(1.5)
  }, {
    input: await title.toBuffer(),
    left: left + fz(3.5),
    top: move() + fz(1.25)
  }, {
    input: splitLine,
    left: left + fz(2.25),
    top: move() + fz(1.5) + titleMeta.height + fz(1),
  })
  let dh = move() + fz(1.5) + titleMeta.height + fz(2.5)
  for (const opt of options) {
    draw({
      input: opt.bg,
      left: left + fz(2.25),
      top: dh,
    }, {
      input: await opt.img.toBuffer(),
      left: left + Math.floor((width - opt.width) / 2),
      top: dh + fz(1.5)
    })
    dh += opt.height + fz(1.5)
  }
  move(height + fz(3))
}
/**
 * @param { { student: Student, content: string } } talk
 * @param { (...args: OverlayOptions[] ) => number } draw
 * @param { (h?: number) => number } move
 */
const drawKizuna = async (talk, draw, move) => {
  const name = talk.student.DisplayName || talk.student.Name
  const content = talk.content.trim() || `进入${name}的好感故事`
  // background: #ffedf1
  const width = imageWidth - fz(16)
  let height = 0
  const title = textPng({
    text: momoConfig.kizunaTitle,
    color: '#4b5a6f',
    maxWidth: width - fz(2.5)
  })
  const leftLine = Buffer.from(`<svg><rect x="0" y="0" width="${fz(0.5)}" height="${fz(3.75)}" fill="#ff8ba0"/></svg>`)
  const titleMeta = await title.metadata()
  height = titleMeta.height + fz(1.5)
  const splitLine = Buffer.from(`<svg><rect x="0" y="0" width="${width - fz(5)}" height="3" fill="${chatBorderColor}"/></svg>`)
  height += fz(1.75)
  // console.log(content)
  const main = textPng({
    text: content,
    color: '#ffedf1',
    maxWidth: width - fz(5),
    align: 'center'
  })
  const meta = await main.metadata()
  const mainBg = Buffer.from(`<svg>
    <rect x="0" y="0"
      width="${width - fz(4)}" height="${meta.height + fz(3)}"
      stroke="${chatBorderColor}" stroke-width="2"
      fill="#ff8ba0"
    rx="${fz(1.5)}" ry="${fz(1.5)}"/>
  </svg>`)
  height += meta.height + fz(5.5)
  // console.log(width, height, chatBorderColor)
  const bg = Buffer.from(`<svg>
    <rect x="0" y="0" width="${width}" height="${height}" stroke="${chatBorderColor}" stroke-width="2" fill="#ffecf2" rx="${fz(1.5)}" ry="${fz(1.5)}"/>
  </svg>`)
  const left = fz(13)
  draw({
    input: bg,
    left,
    top: move()
  }, {
    input: leftLine,
    left: left + fz(2),
    top: move() + fz(1.5)
  }, {
    input: await title.toBuffer(),
    left: left + fz(3.5),
    top: move() + fz(1.25)
  }, {
    input: splitLine,
    left: left + fz(2.25),
    top: move() + fz(1.5) + titleMeta.height + fz(1),
  }, {
    input: mainBg,
    left: left + fz(2.25),
    top: move() + fz(2) + titleMeta.height + fz(2.25)
  }, {
    input: await main.toBuffer(),
    left: left + Math.floor((width - meta.width) / 2),
    top: move() + fz(2) + titleMeta.height + fz(3.75)
  })
  move(height + fz(1.5))
}
/**
 * @function momotalk
 * @param { Message[] } talks
 * @param { (Buffer|string)[] } images
 */
const momotalk = async (talks, images = [], watermark = '') => {
  /** @type { import('sharp').OverlayOptions[] } */
  const comps = []
  let imageHeight = fz(1.5)
  /** @param { import('sharp').OverlayOptions[] } args */
  const draw = (...args) => comps.push(...args)
  const move = (h = 0) => {
    imageHeight += h
    return imageHeight
  }

  // Title
  const titleBg = await sharp({
    create: {
      width: imageWidth - fz(3),
      height: fz(8),
      channels: 4,
      background: momoConfig.titleBackground
    }
  }).composite([{
    input: roundSvg({ width: imageWidth - fz(3), height: fz(8), rx: fz(2.25), ry: fz(2.25) }),
    blend: 'dest-in'
  }]).png().toBuffer()
  draw({
    input: titleBg,
    left: fz(1.5),
    top: move()
  }, {
    input: await sharp(momoConfig.titleIcon || momoSvg).resize(fz(4.5), fz(4.5)).png().toBuffer(),
    left: fz(4),
    top: move() + fz(1.5),
  }, {
    input: await textPng({
      text: momoConfig.title,
      fontSize: fz(4.5),
      color: 'white',
      font: miSans,
      fontfile: miSansFile
    }).toBuffer(),
    left: fz(10),
    top: move() + fz(2)
  }, {
    input: await textPng({
      text: 'X',
      fontSize: fz(5),
      color: 'white',
    }).toBuffer(),
    left: imageWidth - fz(7),
    top: move() + fz(2)
  })
  move(fz(10.5))

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
    move(fz(1.5))
  }

  if (watermark.trim().length) {
    const wm = textPng({
      text: watermark.trim(),
      fontSize: fz(2.5),
      maxWidth: imageWidth - fz(6),
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
    move(meta.height + fz(1.5))
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
