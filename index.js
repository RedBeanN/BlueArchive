const textToMessages = require('./src/textToMessages')
const momotalk = require('./src/momotalk')
const { getStudentsByName, getStudentById, getAll } = require('./src/getStudent')
const studentCard = require('./src/studentCard')
const customStudents = require('./src/customStudents')
const syncData = require('./src/syncData')
module.exports = {
  momotalk: {
    textToMessages,
    build: momotalk.momotalk,
    setConfig: momotalk.setConfig
  },
  students: {
    getAll,
    queryByName: getStudentsByName,
    getById: getStudentById,
    generateCard: studentCard
  },
  customStudents,
  syncData,
}
