const sharp = require('sharp')
/**
 * @typedef { import('./getStudent').Student } Student
 * @typedef { import('sharp').OverlayOptions } OverlayOptions
 */

const imageWidth = 720
/**
 * @param { Student } student
 */
const studentCard = async (student) => {
  /** @type { OverlayOptions[] } */
  const comps = []
  let imageHeight = 0

  const img = sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: '#ffff'
    }
  })
  return img.png()
}
module.exports = studentCard
