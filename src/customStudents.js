/** @type { { Name: string, Icon: string }[] } */
const extraStudents = []
/** @param { { Name: string, Icon: string }[] } students */
const load = (students) => {
  for (const s of students) {
    if (!extraStudents.includes(s)) extraStudents.push(s)
  }
}
const get = () => extraStudents

module.exports = {
  load,
  get
}
