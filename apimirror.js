const killPort = require('kill-port')
const express = require('express')
const { notifyWS } = require('./wsmirror.js')
const { getMirrorFiles } = require('./scpmirror.js')

const startAPI = async () => {
    killPort(process.env.apiport)
    .then(() => {})
    .catch(err => {})
    .finally(() => {
        const api = express()
        api.use(express.json({limit: '16mb'}))
        api.use((req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', '*')
            res.setHeader('Access-Control-Allow-Headers', '*')
            next()
        })
        api.post('/mirrorfiles', async (req, res) => {
            req.uuid = Math.random().toString(36).substring(2, 9)
            getMirrorFiles(req, res)
        })
        api.all('*', async (req, res) => {
            req.uuid = Math.random().toString(36).substring(2, 9)
            req.callback = (data) => {
                if(data)
                    res.status(data.status).json(data.body)
                else
                    res.status(404).send({msg: 'WS error: node not found'})
            }
            notifyWS(req)
        })
        api.listen(process.env.apiport, () => console.log(`API Mirror listening on port ${process.env.apiport}`))
    })
}

module.exports = { startAPI }
