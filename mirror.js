require('dotenv').config()
const { startSCP } = require('./scpmirror.js')
const { startAPI } = require('./apimirror.js')

startSCP()
startAPI()
