const killPort = require('kill-port')
const path = require('path')
const fs = require('fs')
const Joi = require('joi-oid')
const { exec, spawn } = require('child_process')

const schemaGet = Joi.object({
    uuid: Joi.string().min(3).required(),
    aetitle: Joi.string().min(1).max(16).required(),
    files: Joi.array().items(Joi.string().min(1)).min(1).required()
}).unknown(false)

let scp = null

const storescp = path.join('.', 'dcm4chee', 'bin', 'storescp')
const startSCP = () => {
    if(scp){
        if(res) res.status(400).json({msg: 'SCP already running'})
    }
    else {
        killPort(process.env.scpport)
        .then(() => {})
        .catch(err => {})
        .finally(() => {
            const args = `--accept-unknown --tls-aes -b ${process.env.scpport} --directory ${process.env.scpfolder}`
            scp = spawn(storescp, args.split(' '), {shell:true})
            scp.stdout.on('data', () => {})
            scp.stderr.on('data', () => {})
            scp.on('error', code => console.error(`SCP error: ${code}`))
            console.log(`SCP started at on port ${process.env.scpport}`)
        })
    }
}

const mkdirNode = async (folder) => new Promise((resolve, reject) => {
    fs.mkdir(folder, {recursive: true}, err => {
        if(err){
            console.error(`Error on mkdir ${folder}`)
            reject()
        }
        else resolve()
    })
})

const copyFile = async (source, destination) => new Promise((resolve, reject) => {
    fs.copyFile(source, destination, err => {
        if(err) console.error(`Error on copying ${source} to ${destination}`, err)
        resolve()
    })
})

const zipFolder = async (folder, zipPath, aetitle) => new Promise((resolve, reject) => {
    exec(`zip -erP ${aetitle} ${zipPath} ${folder}`, (err, stdout, stderr) => {
        if(err) console.error(`Error ziping folder: ${folder}`, err)
        resolve()
    })
})

const getMirrorFiles = async (req, res) => {
    const validation = schemaGet.validate(req.body)
    if(validation.error)
        return res.status(400).send({validation, msg:'error'})
    const { uuid, aetitle, files } = req.body
    const folder = path.join(process.env.scpfolder, uuid)
    await mkdirNode(folder)
    for(const file of files)
        await copyFile(path.join(process.env.scpfolder, file), path.join(folder, file))
    const zipPath = path.join(folder, `${uuid}.zip`)
    await zipFolder(folder, zipPath, aetitle)
    const readStream = fs.createReadStream(zipPath)
    res.setHeader('Content-Disposition', `attachment; filename="${uuid}.zip"`)
    res.setHeader('Content-Type', 'multipart/form-data')
    readStream.on('open', () => readStream.pipe(res))
    readStream.on('error', (err) => {
        console.error('Runtime mirror SCP error', err)
        res.status(500).send({msg: `Mirror SCP error: ${err}`})
        try { readStream.end() } catch (error) {}
    })
    readStream.on('end', () => {
        console.error(`Done sending mirror SCP: ${zipPath}`)
        exec(`rm -fr ${folder}`, () => {})
        for(const file of files)
            fs.unlink(path.join(process.env.scpfolder, file), () => {})
    })
}

module.exports = { startSCP, getMirrorFiles }
