const fs = require('fs')
const WebSocket = require('ws')

const sessions = new Map()

const startWSServer = () => {
    const wss = new WebSocket.Server({port: process.env.wsport, perMessageDeflate: { serverNoContextTakeover: true }})
    console.log(`WS Mirror listening on port ${process.env.wsport}`)
    wss.on('connection', ws => {
        const sessionId = Math.random().toString(36).substring(2, 10)
        sessions.set(ws, { sessionId })
        console.log(`WS: ${sessionId} -> connected`)
        ws.on('message', data => {
            data = JSON.parse(data)
            const { event } = data
            if(event === 'register'){
                const { authorization, name } = data
                console.log(`WS: ${sessionId} -> registered. authorization: ${authorization} name: ${name}`)
                sessions.set(ws, { sessionId, authorization, name, reqs:[] })
            }
            else if(event === 'response'){
                const session = sessions.get(ws)
                const req = session.reqs.find(req => req.uuid === data.uuid)
                session.reqs = session.reqs.filter(req => req.uuid !== data.uuid)
                req.callback(data)
            }
        })
        ws.on('close', () => {
            console.log(`WS: ${sessionId} -> closed`)
            sessions.delete(ws);
        })
    })
}

const notifyWS = (req) => {
    if(req && req.headers){
        const { url, headers: {authorization, name}, method, body, uuid, callback } = req
        for(const [ws, session] of sessions.entries()){
            if(session && session.authorization === authorization && session.name === name){
                if(ws.readyState === WebSocket.OPEN){
                    ws.send(JSON.stringify({ url, headers: {authorization, name}, method, body, uuid }))
                    session.reqs.push(req)
                    return
                }
            }
        }
    }
    req.callback(false)
}

const chunkSize = 64 * 1024

const notifyWSFile = (req) => new Promise((resolve, reject) => {
    try {
        const { headers: {authorization, name} } = req
        for(const [ws, session] of sessions.entries()){
            if(session && session.authorization === authorization && session.name === name){
                if(ws.readyState === WebSocket.OPEN){
                    const sourceFilePath = req.file.path
                    console.log(`WS: ${session.sessionId} -> sending file ${sourceFilePath}`)
                    const readStream = fs.createReadStream(sourceFilePath, { highWaterMark: chunkSize })
                    readStream.on('data', (chunk) => ws.send(chunk))
                    readStream.on('end', () => {
                        console.log(`WS: ${session.sessionId} req: ${req.uuid} -> complete ${sourceFilePath}`)
                        ws.send('<EOF></EOF>')
                        readStream.destroy()
                        try{ fs.unlink(sourceFilePath) }catch(err){}
                        resolve(true)
                    })
                    readStream.on('error', err => {
                        console.error(`WS: ${session.sessionId} file: ${sourceFilePath} -> error: ${err}`)
                        readStream.destroy()
                        try{ fs.unlink(sourceFilePath) }catch(err){}
                        resolve(false)
                    })
                    break
                }
            }
        }
    } catch (error) {
        console.error(`WS SCP file error: ${error}`)
        resolve(false)
    }
})

module.exports = { startWSServer, notifyWS, notifyWSFile }
