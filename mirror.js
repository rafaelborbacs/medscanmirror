require('dotenv').config()
const { startAPI } = require('./apimirror.js')
const { startWSServer } = require('./wsmirror.js')

startAPI()
startWSServer()
