/**
 * @param { import('../types/student').Student } student
 * @param { number } level
 */
const getBondStats = (student, level = 50) => {
  var stat1 = 0, stat2 = 0
  for (let i = 1; i < Math.min(level, 50); i++) {
      if (i < 20) {
          stat1 += student.FavorStatValue[Math.floor(i / 5)][0]
          stat2 += student.FavorStatValue[Math.floor(i / 5)][1]
      } else if (i < 50) {
          stat1 += student.FavorStatValue[2 + Math.floor(i / 10)][0]
          stat2 += student.FavorStatValue[2 + Math.floor(i / 10)][1]
      }
  }
  return {[student.FavorStatType[0]]: stat1, [student.FavorStatType[1]]: stat2}
}
module.exports = getBondStats
