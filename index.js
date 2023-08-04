const textToMessages = require('./src/textToMessages')
const momotalk = require('./src/momotalk')
const { getStudentsByName, getStudentById } = require('./src/getStudent')
const customStudents = require('./src/customStudents')
module.exports = {
  momotalk: {
    textToMessages,
    build: momotalk.momotalk,
    setConfig: momotalk.setConfig
  },
  students: {
    queryByName: getStudentsByName,
    getById: getStudentById,
  },
  customStudents,
}
