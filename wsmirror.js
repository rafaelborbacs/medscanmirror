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
                if(ws && ws.readyState === WebSocket.OPEN){
                    ws.send(JSON.stringify({ url, headers: {authorization, name}, method, body, uuid }))
                    console.log(`(1) SEND: sessionId: ${session.sessionId} ws: ${ws.readyState} payload: ${JSON.stringify({ url, headers: {authorization, name}, method, body, uuid })}`)
                    session.reqs.push(req)
                    return
                }
            }
        }
    }
    req.callback(false)
}

module.exports = { startWSServer, notifyWS }
