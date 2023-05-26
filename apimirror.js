const killPort = require('kill-port')
const express = require('express')
const { getMirrorFiles } = require('./scpmirror.js')

const arrived = []
const processing = []

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
        api.get('/status', async (req, res) => res.json({msg:'ok'}))
        api.post('/mirrorfiles', getMirrorFiles)
        api.put('/put', (req, res) => {
            const { authentication, name, uuid } = req.headers
            if(!authentication || !name || !uuid)
                res.status(400).json({msg: 'authentication and uuid required'})
            const originalReq = processing.find(r => r.authentication === authentication && r.name === name && r.uuid === uuid)
            if(originalReq){
                processing.splice(processing.indexOf(originalReq), 1)
                const { status, body } = req.body
                originalReq.res.status(status).json(body)
                res.status(status).json(body)
            }
            else res.status(404).json({msg: 'not found'})
        })
        api.get('/get', (req, res) => {
            const originalReq = arrived.find(r => r.headers.authentication === req.headers.authentication && r.headers.name === req.headers.name)
            if(originalReq){
                arrived.splice(arrived.indexOf(originalReq), 1)
                processing.push(originalReq)
                const { method, url, body, headers } = originalReq
                const { authorization, name, uuid } = headers
                res.json({ method, url, body, uuid, headers: { authorization, name, uuid } })
            }
            else res.json(false)
        })
        api.all('*', (req, res) => {
            if(!req || !req.headers || !req.headers.authentication || !req.headers.name)
                res.status(400).json({msg: 'authentication required'})
            req.headers.uuid = Math.random().toString(36).substring(2, 9)
            req.res = res
            arrived.push(req)
        })
        api.listen(process.env.apiport, () => console.log(`API Mirror listening on port ${process.env.apiport}`))
    })
}

module.exports = { startAPI }
