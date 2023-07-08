require('dotenv').config()
const { exec } = require('child_process')
const { startSCP } = require('./scpmirror.js')
const { startAPI } = require('./apimirror.js')

startSCP()
startAPI()
exec('curl ifconfig.me', (err, stdout, stderr) => {
    if(stdout) console.log(`Mirror IP: ${stdout}`)
})
