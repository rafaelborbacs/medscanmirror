const killPort = require('kill-port')
const express = require('express')
const { getMirrorFiles } = require('./scpmirror.js')

const arrived = []
const processing = []

const min1 = 1 * 60 * 1000
const min3 = 3 * 60 * 1000
const timeoutReqs = () => {
    const now = new Date()
    for(const req of arrived){
        if((now - req.createdat) > min1){
            arrived.splice(arrived.indexOf(req), 1)
            try { req.res.status(500).json({msg:'mirror GET timeout'}) } catch (err) {}
        }
    }
    for(const req of processing){
        if((now - req.createdat) > min3){
            processing.splice(processing.indexOf(req), 1)
            try { req.res.status(500).json({msg:'mirror PUT timeout'}) } catch (err) {}
        }
    }
}

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
            const { authorization, name, uuid } = req.headers
            if(!authorization || !name || !uuid)
                return res.status(400).json({msg: 'authentication and uuid required'})
            const originalReq = processing.find(r => r.headers.authorization === authorization && r.headers.name === name && r.headers.uuid === uuid)
            if(originalReq){
                processing.splice(processing.indexOf(originalReq), 1)
                const { status, body } = req.body
                originalReq.res.status(status).json(body)
                return res.status(status).json(body)
            }
            res.status(404).json({msg: 'not found'})
        })
        api.get('/get', (req, res) => {
            const originalReq = arrived.find(r => r.headers.authorization === req.headers.authorization && r.headers.name === req.headers.name)
            if(originalReq){
                arrived.splice(arrived.indexOf(originalReq), 1)
                processing.push(originalReq)
                const { method, url, body, headers } = originalReq
                const { authorization, name, uuid } = headers
                return res.json({ method, url, body, headers: { authorization, name, uuid } })
            }
            res.json(false)
        })
        api.all('*', (req, res) => {
            if(!req || !req.headers || !req.headers.authorization || !req.headers.name)
                res.status(400).json({msg: 'authentication required'})
            req.headers.uuid = Math.random().toString(36).substring(2, 9)
            req.res = res
            req.createdat = new Date()
            arrived.push(req)
        })
        api.listen(process.env.apiport, () => console.log(`API Mirror listening on port ${process.env.apiport}`))
        setInterval(timeoutReqs, 60000)
    })
}

module.exports = { startAPI }
