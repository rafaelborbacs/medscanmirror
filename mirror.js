require('dotenv').config()
const { startSCP } = require('./scpmirror.js')
const { startAPI } = require('./apimirror.js')
const { startWSServer } = require('./wsmirror.js')

startSCP()
startAPI()
startWSServer()
